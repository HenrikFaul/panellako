// generate-assembly-protocol — Supabase Edge Function
// Generates a Közgyűlési Jegyzőkönyv (Assembly Minutes) PDF using pdf-lib,
// uploads it to Supabase Storage, and updates the meetings table.
// Triggered by closeMeeting() or generateProtocolManually() server actions.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { PDFDocument, StandardFonts, rgb } from 'https://esm.sh/pdf-lib@1.17.1';

const STORAGE_BUCKET = 'documents';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Hungarian → ASCII transliteration for standard PDF fonts
function toAscii(text: string): string {
  return text
    .replace(/[áÁ]/g, (c) => c === 'á' ? 'a' : 'A')
    .replace(/[éÉ]/g, (c) => c === 'é' ? 'e' : 'E')
    .replace(/[íÍ]/g, (c) => c === 'i' ? 'I' : 'I')
    .replace(/[óÓöÖőŐ]/g, (c) => 'oOoOoO'['óÓöÖőŐ'.indexOf(c)])
    .replace(/[úÚüÜűŰ]/g, (c) => 'uUuUuU'['úÚüÜűŰ'.indexOf(c)])
    .replace(/[^a-zA-Z0-9 .,;:!?/()\-_@#%&=+<>[\]{}'"]/g, '?');
}

function drawWrappedText(
  page: ReturnType<PDFDocument['addPage']>,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  fontSize: number,
  font: Awaited<ReturnType<PDFDocument['embedFont']>>,
  color = rgb(0, 0, 0),
  lineHeight = fontSize * 1.4
): number {
  const safe = toAscii(text);
  const words = safe.split(' ');
  let line = '';
  let currentY = y;

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    const width = font.widthOfTextAtSize(testLine, fontSize);
    if (width > maxWidth && line) {
      page.drawText(line, { x, y: currentY, size: fontSize, font, color });
      currentY -= lineHeight;
      line = word;
    } else {
      line = testLine;
    }
  }
  if (line) {
    page.drawText(line, { x, y: currentY, size: fontSize, font, color });
    currentY -= lineHeight;
  }
  return currentY;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { meeting_id, building_id } = await req.json() as { meeting_id: string; building_id: string };

    if (!meeting_id || !building_id) {
      return new Response(JSON.stringify({ error: 'meeting_id and building_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // ── Fetch all meeting data ────────────────────────────────────────────────
    const [meetingRes, buildingRes, agendaRes, resolutionsRes, attendancesRes, unitsRes] = await Promise.all([
      supabase.from('meetings').select('*').eq('id', meeting_id).single(),
      supabase.from('buildings').select('name, address').eq('id', building_id).single(),
      supabase.from('agenda_items').select('*').eq('meeting_id', meeting_id).order('order_no'),
      supabase.from('resolutions').select('*').eq('meeting_id', meeting_id),
      supabase.from('meeting_attendances').select('*, units(unit_label, owner_name, ownership_share)').eq('meeting_id', meeting_id),
      supabase.from('units').select('ownership_share').eq('building_id', building_id),
    ]);

    if (meetingRes.error || !meetingRes.data) {
      return new Response(JSON.stringify({ error: 'Meeting not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const meeting = meetingRes.data;
    const building = buildingRes.data ?? { name: 'N/A', address: 'N/A' };
    const agenda = agendaRes.data ?? [];
    const resolutions = resolutionsRes.data ?? [];
    const attendances = attendancesRes.data ?? [];
    const allUnits = unitsRes.data ?? [];

    const totalBuildingShare = allUnits.reduce((s: number, u: { ownership_share: number }) => s + u.ownership_share, 0);
    const totalAttendingShare = attendances.reduce((s: number, a: { ownership_share: number }) => s + a.ownership_share, 0);
    const quorumPct = totalBuildingShare > 0 ? (totalAttendingShare / totalBuildingShare) * 100 : 0;
    const isQuorate = quorumPct >= (meeting.quorum_threshold ?? 0.5) * 100;

    const scheduledDate = new Date(meeting.scheduled_at);
    const dateStr = scheduledDate.toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = scheduledDate.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' });

    // ── Build PDF ─────────────────────────────────────────────────────────────
    const pdfDoc = await PDFDocument.create();
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const italicFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

    const pageWidth = 595; // A4
    const pageHeight = 842;
    const margin = 50;
    const contentWidth = pageWidth - 2 * margin;
    const gray = rgb(0.4, 0.4, 0.4);
    const black = rgb(0, 0, 0);
    const darkBlue = rgb(0.07, 0.18, 0.44);

    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;

    const newPage = () => {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    };

    const checkY = (needed: number) => {
      if (y < margin + needed) newPage();
    };

    // ── Cover header ──────────────────────────────────────────────────────────
    page.drawRectangle({ x: 0, y: pageHeight - 80, width: pageWidth, height: 80, color: darkBlue });
    page.drawText('KOZGYULESI JEGYZOKONYV', {
      x: margin, y: pageHeight - 35, size: 18, font: boldFont, color: rgb(1, 1, 1),
    });
    page.drawText('Kozgyulesi Jegyzokonyv — Assembly Minutes', {
      x: margin, y: pageHeight - 55, size: 9, font: italicFont, color: rgb(0.8, 0.9, 1),
    });
    y = pageHeight - 100;

    // ── Section 1: Building data ──────────────────────────────────────────────
    page.drawText('1. EPULET ADATAI', { x: margin, y, size: 11, font: boldFont, color: darkBlue });
    y -= 18;
    const buildingRows = [
      ['Epulet neve:', toAscii(building.name)],
      ['Cim:', toAscii(building.address)],
      ['Osszesen albetet:', `${allUnits.length} db`],
    ];
    for (const [label, value] of buildingRows) {
      page.drawText(label, { x: margin, y, size: 9, font: boldFont, color: black });
      page.drawText(value, { x: margin + 140, y, size: 9, font: regularFont, color: black });
      y -= 14;
    }
    y -= 10;

    // ── Section 2: Meeting data ───────────────────────────────────────────────
    checkY(80);
    page.drawText('2. KOZGYULES ADATAI', { x: margin, y, size: 11, font: boldFont, color: darkBlue });
    y -= 18;
    const meetingRows = [
      ['Cim:', toAscii(meeting.title)],
      ['Idopont:', `${dateStr} ${timeStr}`],
      ['Helyszin:', toAscii(meeting.location ?? 'N/A')],
      ['Levezeto elnok:', toAscii(meeting.chairperson_name ?? 'N/A')],
      ['Jegyzokonyvvezeto:', toAscii(meeting.secretary_name ?? 'N/A')],
    ];
    for (const [label, value] of meetingRows) {
      page.drawText(label, { x: margin, y, size: 9, font: boldFont, color: black });
      page.drawText(value, { x: margin + 140, y, size: 9, font: regularFont, color: black });
      y -= 14;
    }
    y -= 10;

    // ── Section 3: Quorum ─────────────────────────────────────────────────────
    checkY(70);
    page.drawText('3. HATAROZATKEPESSEG (QUORUM)', { x: margin, y, size: 11, font: boldFont, color: darkBlue });
    y -= 18;
    const quorumColor = isQuorate ? rgb(0.06, 0.53, 0.47) : rgb(0.84, 0.13, 0.13);
    const quorumStatus = isQuorate ? 'HATAROZATKEPESNEK MINOSUL' : 'HATAROZATKEPTELENNEK MINOSUL';
    page.drawText(`Megjelent tulaj. hanyad: ${quorumPct.toFixed(1)}%`, { x: margin, y, size: 10, font: regularFont, color: black });
    y -= 15;
    page.drawText(`Kuszob (Ptk. 5:85): ${((meeting.quorum_threshold ?? 0.5) * 100).toFixed(0)}%`, { x: margin, y, size: 10, font: regularFont, color: black });
    y -= 15;
    page.drawText(`Status: ${quorumStatus}`, { x: margin, y, size: 11, font: boldFont, color: quorumColor });
    y -= 10;
    if (!isQuorate) {
      y -= 5;
      page.drawText('Ptk. 5:85 alapjan a kozgyules hatarozatkeptelen. 15 napon belul', { x: margin, y, size: 8, font: italicFont, color: rgb(0.5, 0.5, 0.5) });
      y -= 12;
      page.drawText('megismetelt kozgyulest kell osszehivni, amely mar hatarozatkepesnek minosul.', { x: margin, y, size: 8, font: italicFont, color: rgb(0.5, 0.5, 0.5) });
    }
    y -= 15;

    // ── Section 4: Attendances ────────────────────────────────────────────────
    checkY(60);
    page.drawText('4. JELENLEVSOK LISTAJA', { x: margin, y, size: 11, font: boldFont, color: darkBlue });
    y -= 18;
    page.drawText(`Megjelent: ${attendances.length} fo / ${allUnits.length} albetet`, { x: margin, y, size: 9, font: regularFont, color: gray });
    y -= 14;

    // Table header
    page.drawRectangle({ x: margin, y: y - 2, width: contentWidth, height: 14, color: rgb(0.9, 0.93, 0.98) });
    page.drawText('Albetet', { x: margin + 3, y, size: 8, font: boldFont, color: black });
    page.drawText('Tulajdonos neve', { x: margin + 60, y, size: 8, font: boldFont, color: black });
    page.drawText('Tulajd. hanyad', { x: margin + 260, y, size: 8, font: boldFont, color: black });
    page.drawText('Meghatalmazott', { x: margin + 360, y, size: 8, font: boldFont, color: black });
    y -= 16;

    for (const att of attendances.slice(0, 30)) {
      checkY(14);
      const unit = (att as { units?: { unit_label: string; owner_name: string; ownership_share: number } }).units;
      page.drawText(toAscii(unit?.unit_label ?? 'N/A'), { x: margin + 3, y, size: 8, font: regularFont, color: black });
      page.drawText(toAscii(unit?.owner_name ?? 'N/A').substring(0, 30), { x: margin + 60, y, size: 8, font: regularFont, color: black });
      page.drawText(`${((att.ownership_share ?? 0) * 100).toFixed(2)}%`, { x: margin + 260, y, size: 8, font: regularFont, color: black });
      page.drawText(toAscii(att.proxy_name ?? '-'), { x: margin + 360, y, size: 8, font: regularFont, color: black });
      y -= 13;
    }
    y -= 10;

    // ── Section 5: Agenda items ───────────────────────────────────────────────
    checkY(60);
    page.drawText('5. NAPIRENDI PONTOK ES HATAROZATOK', { x: margin, y, size: 11, font: boldFont, color: darkBlue });
    y -= 20;

    for (const item of agenda) {
      checkY(50);
      page.drawText(`${item.order_no}. ${toAscii(item.title)}`, { x: margin, y, size: 10, font: boldFont, color: black });
      y -= 14;
      if (item.description) {
        y = drawWrappedText(page, item.description, margin + 10, y, contentWidth - 10, 8, regularFont, gray);
        y -= 4;
      }

      // Resolutions for this agenda item
      const itemResolutions = resolutions.filter((r: { agenda_item_id: string }) => r.agenda_item_id === item.id);
      for (const res of itemResolutions) {
        checkY(40);
        const outcomeColor = res.outcome === 'elfogadva' ? rgb(0.06, 0.53, 0.47) : res.outcome === 'elutasitva' ? rgb(0.84, 0.13, 0.13) : gray;
        page.drawText(`Hatarozat: [${(res.outcome ?? 'folyamatban').toUpperCase()}]`, { x: margin + 10, y, size: 9, font: boldFont, color: outcomeColor });
        y -= 13;
        y = drawWrappedText(page, res.text, margin + 10, y, contentWidth - 20, 8, regularFont);
        y -= 5;
        if (res.effective_date) {
          page.drawText(`Hataaly: ${res.effective_date}`, { x: margin + 10, y, size: 8, font: italicFont, color: gray });
          y -= 12;
        }
      }
      y -= 8;
    }

    // ── Section 6: Signature block ────────────────────────────────────────────
    checkY(120);
    y -= 20;
    page.drawText('6. ALAIRASOK', { x: margin, y, size: 11, font: boldFont, color: darkBlue });
    y -= 30;

    const sigY = y;
    page.drawLine({ start: { x: margin, y: sigY }, end: { x: margin + 160, y: sigY }, thickness: 0.8, color: black });
    page.drawText(toAscii(meeting.chairperson_name ?? 'Levezeto elnok'), { x: margin, y: sigY - 14, size: 8, font: regularFont, color: gray });
    page.drawText('Levezeto elnok', { x: margin, y: sigY - 24, size: 7, font: italicFont, color: gray });

    page.drawLine({ start: { x: margin + 230, y: sigY }, end: { x: margin + 390, y: sigY }, thickness: 0.8, color: black });
    page.drawText(toAscii(meeting.secretary_name ?? 'Jegyzokonyvvezeto'), { x: margin + 230, y: sigY - 14, size: 8, font: regularFont, color: gray });
    page.drawText('Jegyzokonyvvezeto', { x: margin + 230, y: sigY - 24, size: 7, font: italicFont, color: gray });

    y = sigY - 50;

    // ── Footer on last page ───────────────────────────────────────────────────
    checkY(30);
    page.drawLine({ start: { x: margin, y: margin + 20 }, end: { x: pageWidth - margin, y: margin + 20 }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });
    page.drawText(`Keszult: ${new Date().toLocaleDateString('hu-HU')} | PanelLako platform | Ptk. 5:84-5:88`, {
      x: margin, y: margin + 5, size: 7, font: italicFont, color: rgb(0.6, 0.6, 0.6),
    });

    // ── Serialize + Upload ────────────────────────────────────────────────────
    const pdfBytes = await pdfDoc.save();
    const storagePath = `assembly-protocols/${building_id}/${meeting_id}.pdf`;

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, pdfBytes, { contentType: 'application/pdf', upsert: true });

    if (uploadError) {
      console.error('[generate-assembly-protocol] Upload error:', uploadError);
      return new Response(JSON.stringify({ error: `Storage upload failed: ${uploadError.message}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Update meetings table ─────────────────────────────────────────────────
    await supabase
      .from('meetings')
      .update({
        protocol_url: storagePath,
        protocol_generated_at: new Date().toISOString(),
      })
      .eq('id', meeting_id);

    // ── Log to audit_logs ─────────────────────────────────────────────────────
    await supabase.from('audit_logs').insert({
      actor_id: null,
      actor_name: 'Rendszer',
      action_type: 'protocol_generated',
      entity_type: 'meeting',
      entity_id: meeting_id,
      entity_label: `Kozgyulesi Jegyzokonyv: ${storagePath}`,
    });

    return new Response(
      JSON.stringify({ success: true, protocol_url: storagePath, quorum_pct: quorumPct, is_quorate: isQuorate }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[generate-assembly-protocol] Fatal error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
