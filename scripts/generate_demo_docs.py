#!/usr/bin/env python3
"""
Generate 4 demo PDF documents for Panellako document storage and upload them.
Documents:
  1. Szervezeti és Működési Szabályzat (SZMSZ) — v3.1
  2. Éves elszámolás 2025 — v1.0
  3. Közgyűlési meghívó – 2026. június 10. — v1.0
  4. Tűzvédelmi szabályzat — v2.0
"""

import io
import os
import sys
import urllib.request
import urllib.parse
import json
import datetime

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "https://wzromwxpjlyrqbdiapep.supabase.co")
SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
BUCKET = "documents"

BRAND_DARK = colors.HexColor("#0f172a")
BRAND_PRIMARY = colors.HexColor("#6d28d9")
BRAND_LIGHT = colors.HexColor("#ede9fe")
SLATE_500 = colors.HexColor("#64748b")
SLATE_200 = colors.HexColor("#e2e8f0")
EMERALD = colors.HexColor("#059669")
ROSE = colors.HexColor("#e11d48")
AMBER = colors.HexColor("#d97706")


def styles():
    ss = getSampleStyleSheet()
    return {
        "title": ParagraphStyle("title", fontName="Helvetica-Bold", fontSize=20, textColor=BRAND_DARK,
                                 spaceAfter=6, spaceBefore=0, alignment=TA_CENTER),
        "subtitle": ParagraphStyle("subtitle", fontName="Helvetica", fontSize=11, textColor=SLATE_500,
                                    spaceAfter=4, alignment=TA_CENTER),
        "h2": ParagraphStyle("h2", fontName="Helvetica-Bold", fontSize=13, textColor=BRAND_PRIMARY,
                              spaceAfter=4, spaceBefore=14),
        "h3": ParagraphStyle("h3", fontName="Helvetica-Bold", fontSize=11, textColor=BRAND_DARK,
                              spaceAfter=3, spaceBefore=10),
        "body": ParagraphStyle("body", fontName="Helvetica", fontSize=10, textColor=BRAND_DARK,
                                spaceAfter=4, leading=14, alignment=TA_JUSTIFY),
        "small": ParagraphStyle("small", fontName="Helvetica", fontSize=9, textColor=SLATE_500,
                                 spaceAfter=2, leading=12),
        "bold": ParagraphStyle("bold", fontName="Helvetica-Bold", fontSize=10, textColor=BRAND_DARK,
                                spaceAfter=3),
        "footer": ParagraphStyle("footer", fontName="Helvetica", fontSize=8, textColor=SLATE_500,
                                  alignment=TA_CENTER),
        "right": ParagraphStyle("right", fontName="Helvetica", fontSize=10, textColor=BRAND_DARK,
                                 alignment=TA_RIGHT, spaceAfter=4),
    }


def header_block(buf_styles, title, subtitle, date_str, doc_no=None):
    elems = []
    elems.append(Paragraph("PANELLAKO", ParagraphStyle("brand", fontName="Helvetica-Bold", fontSize=9,
                                                         textColor=BRAND_PRIMARY, alignment=TA_CENTER, spaceAfter=2)))
    elems.append(Paragraph("Lakaskezelesi Rendszer", ParagraphStyle("brandSub", fontName="Helvetica", fontSize=8,
                                                                      textColor=SLATE_500, alignment=TA_CENTER, spaceAfter=8)))
    elems.append(HRFlowable(width="100%", thickness=2, color=BRAND_PRIMARY, spaceAfter=10))
    elems.append(Paragraph(title, buf_styles["title"]))
    elems.append(Paragraph(subtitle, buf_styles["subtitle"]))
    if doc_no:
        elems.append(Paragraph(f"Dokumentumszam: {doc_no}", ParagraphStyle("docno", fontName="Helvetica",
                                                                              fontSize=9, textColor=SLATE_500, alignment=TA_CENTER, spaceAfter=2)))
    elems.append(Paragraph(f"Kelt: {date_str}", ParagraphStyle("date", fontName="Helvetica",
                                                                  fontSize=9, textColor=SLATE_500, alignment=TA_CENTER, spaceAfter=4)))
    elems.append(HRFlowable(width="100%", thickness=0.5, color=SLATE_200, spaceAfter=16))
    return elems


def build_szmsz():
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, rightMargin=2.5*cm, leftMargin=2.5*cm,
                             topMargin=2*cm, bottomMargin=2*cm, title="SZMSZ v3.1")
    s = styles()
    e = []
    e += header_block(s,
                      "Szervezeti es Mukodesi Szabalyzat",
                      "Balatonpart utca 12., Budapest — v3.1",
                      "2026. aprilis 16.",
                      "SZMSZ-2026-003")

    e.append(Paragraph("1. ALTALANOS RENDELKEZESEK", s["h2"]))
    e.append(Paragraph(
        "1.1. Jelen Szervezeti es Mukodesi Szabalyzat (tovabbiakban: SZMSZ) a Balatonpart utca 12. szamu "
        "tarsashaz (tovabbiakban: epulet) tulajdonosi kozossegere vonatkozo belso szabalyokat, "
        "a kozos kepviselet rendjere, a kozgyules osszehivasanak es levezetesinek rendjere, "
        "valamint a penzugyi eljarasokra vonatkozo rendelkezeseket tartalmazza.",
        s["body"]))
    e.append(Paragraph(
        "1.2. Az SZMSZ hatalya kiterjed az epulet osszes lakotulajdonosara, berlojere es az epuletben "
        "mukodo barmely szemelyre vagy szervezetre. A szabalyzat betartasa minden erdekeltre kotelezo.",
        s["body"]))
    e.append(Paragraph(
        "1.3. Jelen szabalyzat 2026. aprilis 16. napjan lep hatalyba, es hatarzatlan ideig ervenyesul, "
        "kiveve ha azt a tulajdonosi kozosseg maskepp hatarozza meg.",
        s["body"]))

    e.append(Paragraph("2. A KOZOS KEPVISELO", s["h2"]))
    e.append(Paragraph(
        "2.1. A kozos kepviselot a tulajdonosi kozosseg 5 (ot) evre valasztja meg titkos szavazassal. "
        "A megbizetsi ido lejartaval a kozos kepviselo ujravalaszthatja magat.",
        s["body"]))
    e.append(Paragraph(
        "2.2. A kozos kepviselo feladata: az epulet fenntartasaval kapcsolatos szerzodeskotes, "
        "penzugyi nyilvantartas vezetese, a kozgyules osszehivasa, hatosagokkal valo kapcsolattartas, "
        "karbejelentes es karrendezes koordinalasa.",
        s["body"]))
    e.append(Paragraph(
        "2.3. A kozos kepviselo szamara a tulajdonosok evente dijazast fizetnek, amelyet a kozgyules "
        "evente hatarozattal allapit meg. A dijazas merteke 2026-ban: 45 000 Ft/ho.",
        s["body"]))

    e.append(Paragraph("3. KOZGYULES", s["h2"]))
    e.append(Paragraph(
        "3.1. A kozgyulest evente legalabb egyszer kell osszehivni (rendes kozgyules). "
        "Rendkivuli kozgyulest kell tartani, ha azt a tulajdonosi hanyad 1/4-et kitevo "
        "tulajdonos irja ala az indoklas megjelolevel.",
        s["body"]))
    e.append(Paragraph(
        "3.2. A kozgyulesi meghivot legalabb 8 nappal a kozgyules elott irott formaban "
        "(postai level vagy igazolhato elektronikus uzenet) meg kell kuldeni minden tulajdonosnak. "
        "(Ptk. 5:84. §)",
        s["body"]))
    e.append(Paragraph(
        "3.3. A kozgyules hatarzatkepes, ha azon a tulajdoni hanyad tobb mint felet kepviselo "
        "tulajdonosok jelen vannak. Hatarozathozatalhoz egyszerubb kerdesekben egyszeru szotobbs, "
        "fontos kerdesekben (pl. alap- es szervezeti szabalyzat modositasa) minositett szotobbs (2/3) szu­kseges.",
        s["body"]))

    e.append(Paragraph("4. KARBANTARTAS ES FELUJITAS", s["h2"]))
    e.append(Paragraph(
        "4.1. Az epulet kozos teruleteinek (folyosok, liftakna, teto, alapzat, kulso falak) "
        "karbantartasa a tulajdonosi kozosseg feladata es koltseget a tulaj­donosi hanyad alapjan "
        "viselik a tulajdonosok.",
        s["body"]))
    e.append(Paragraph(
        "4.2. Szuksegszerunek mino­sulo munkak (hebing javitas, csovizsgalat, villanyolo csere) "
        "30 000 Ft ertekig a kozos kepviselo is elrendelheto a kozgyules bevonasa nelkul. "
        "E felett kozgyulesi hatarzat szu­kseges.",
        s["body"]))

    data = [
        ["Tipusa", "Hatarertek", "Dontes"],
        ["Apro karbantartas", "< 30 000 Ft", "Kozos kepviselo"],
        ["Kozepes munkak", "30 000 – 500 000 Ft", "Kozgyulesi hatarzat"],
        ["Nagyobb felujitas", "> 500 000 Ft", "Minositett szotobbs (2/3)"],
        ["Beruhazas", "> 2 000 000 Ft", "Minositett szotobbs + penzugyi terv"],
    ]
    tbl = Table(data, colWidths=[4.5*cm, 5*cm, 6*cm])
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BRAND_PRIMARY),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
        ("GRID", (0, 0), (-1, -1), 0.5, SLATE_200),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
    ]))
    e.append(tbl)
    e.append(Spacer(1, 12))

    e.append(Paragraph("5. PENZUGYI RENDELKEZESEK", s["h2"]))
    e.append(Paragraph(
        "5.1. A kozos koltseg befizetese minden honapban 10-ig tortenik a kozoset szamlar. "
        "Kesesei befizetesre a polgari jog altalanos szabalyai szerinti kesedelmi kamat kerhet.",
        s["body"]))
    e.append(Paragraph(
        "5.2. Ev vegen a kozos kepviselo elszamolast keszit a bevetelerol es kiadaskrol, "
        "amelyet a kozgyules ele terjest jovahagyas vegett. Az elszamolast minden tulajdonos "
        "megtekintheti.",
        s["body"]))

    e.append(Spacer(1, 20))
    e.append(HRFlowable(width="100%", thickness=0.5, color=SLATE_200, spaceAfter=10))
    sig_data = [
        ["", ""],
        ["....................................", "...................................."],
        ["Kozos kepviselo alairas", "Tulajdonosi kozosseg kepviseloje"],
        ["Budapest, 2026. aprilis 16.", ""],
    ]
    sig_tbl = Table(sig_data, colWidths=[8*cm, 8*cm])
    sig_tbl.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("TEXTCOLOR", (0, 0), (-1, -1), SLATE_500),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
    ]))
    e.append(sig_tbl)

    doc.build(e)
    buf.seek(0)
    return buf.read()


def build_elszamolas():
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, rightMargin=2.5*cm, leftMargin=2.5*cm,
                             topMargin=2*cm, bottomMargin=2*cm, title="Eves elszamolas 2025")
    s = styles()
    e = []
    e += header_block(s,
                      "Eves Elszamolas — 2025",
                      "Balatonpart utca 12., Budapest",
                      "2026. majus 6.",
                      "ELSZAM-2026-001")

    e.append(Paragraph("BEVETEL", s["h2"]))
    income = [
        ["Tetel", "Tervezett (Ft)", "Tényleges (Ft)", "Elteresek"],
        ["Kozos koltseg befizetesek", "3 600 000", "3 480 000", "-120 000"],
        ["Felujitasi alap befizetesek", "1 200 000", "1 200 000", "0"],
        ["Berbeadasi bevetel (kozos helyseg)", "240 000", "240 000", "0"],
        ["Kamatok, egyeb bevetel", "18 000", "23 400", "+5 400"],
        ["OSSZESEN", "5 058 000", "4 943 400", "-114 600"],
    ]
    inc_tbl = Table(income, colWidths=[6*cm, 3.5*cm, 3.5*cm, 2.5*cm])
    inc_tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BRAND_PRIMARY),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        ("BACKGROUND", (0, -1), (-1, -1), BRAND_LIGHT),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ROWBACKGROUNDS", (0, 1), (-1, -2), [colors.white, colors.HexColor("#f8fafc")]),
        ("GRID", (0, 0), (-1, -1), 0.5, SLATE_200),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
    ]))
    e.append(inc_tbl)
    e.append(Spacer(1, 12))

    e.append(Paragraph("KIADAS", s["h2"]))
    expenses = [
        ["Tetel", "Tervezett (Ft)", "Tényleges (Ft)", "Elteresek"],
        ["Portaszolgalat", "1 080 000", "1 080 000", "0"],
        ["Takaritas (kozos terek)", "360 000", "360 000", "0"],
        ["Lift karbantartas", "240 000", "218 000", "-22 000"],
        ["Futes (kozos terek)", "480 000", "512 000", "+32 000"],
        ["Villany (kozos terek)", "180 000", "167 400", "-12 600"],
        ["Biztositas", "156 000", "156 000", "0"],
        ["Kozos kepviselo dijazas", "540 000", "540 000", "0"],
        ["Karbantartasi munkak", "300 000", "284 000", "-16 000"],
        ["Irodai koltesegek, postakolts", "36 000", "29 800", "-6 200"],
        ["Rendkivuli javitasok (csotores 3. em.)", "0", "78 600", "+78 600"],
        ["Felujitasi alap felhasznalasa", "0", "0", "0"],
        ["OSSZESEN", "3 372 000", "3 425 800", "+53 800"],
    ]
    exp_tbl = Table(expenses, colWidths=[6*cm, 3.5*cm, 3.5*cm, 2.5*cm])
    exp_tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BRAND_PRIMARY),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        ("BACKGROUND", (0, -1), (-1, -1), BRAND_LIGHT),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ROWBACKGROUNDS", (0, 1), (-1, -2), [colors.white, colors.HexColor("#f8fafc")]),
        ("GRID", (0, 0), (-1, -1), 0.5, SLATE_200),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
        ("TEXTCOLOR", (3, 11), (3, 11), ROSE),
        ("TEXTCOLOR", (3, 3), (3, 3), EMERALD),
    ]))
    e.append(exp_tbl)
    e.append(Spacer(1, 12))

    e.append(Paragraph("EGYENLEG", s["h2"]))
    summary = [
        ["", "Ft"],
        ["Osszes bevetel", "4 943 400"],
        ["Osszes kiadas", "3 425 800"],
        ["Egyenleg (megtakaritas)", "1 517 600"],
        ["Ebbol felujitasi alapba utalva:", "1 200 000"],
        ["Szabad egyenleg (folyoszamla)", "317 600"],
    ]
    sum_tbl = Table(summary, colWidths=[10*cm, 5.5*cm])
    sum_tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BRAND_PRIMARY),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTNAME", (0, 3), (-1, 3), "Helvetica-Bold"),
        ("BACKGROUND", (0, 3), (-1, 3), colors.HexColor("#d1fae5")),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
        ("GRID", (0, 0), (-1, -1), 0.5, SLATE_200),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
    ]))
    e.append(sum_tbl)
    e.append(Spacer(1, 12))

    e.append(Paragraph("MEGJEGYZES", s["h2"]))
    e.append(Paragraph(
        "A rendkivuli kiadast (csotores, 3. emelet) a biztosito reszben megtéritette — "
        "az elszamolasba mar a netto kiesest vettuk figyelembe. "
        "A teljes elszamolas reszletes bizonylataival a kozos kepviselo iratai kozott megtalalhato.",
        s["body"]))

    e.append(Spacer(1, 20))
    e.append(HRFlowable(width="100%", thickness=0.5, color=SLATE_200, spaceAfter=10))
    e.append(Paragraph("Az elszamolast keszitette:", s["small"]))
    e.append(Paragraph("Kozos Kepviselo — Budapest, 2026. majus 6.", s["bold"]))

    doc.build(e)
    buf.seek(0)
    return buf.read()


def build_meghivo():
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, rightMargin=2.5*cm, leftMargin=2.5*cm,
                             topMargin=2*cm, bottomMargin=2*cm, title="Kozgyulesi meghivo 2026-06-10")
    s = styles()
    e = []
    e += header_block(s,
                      "KOZGYULESI MEGHIVO",
                      "Balatonpart utca 12. Tarsashaz Tulajdonosi Kozossege",
                      "2026. majus 11.",
                      "KGY-2026-002")

    e.append(Paragraph("Tisztelt Tulajdonosok!", s["bold"]))
    e.append(Spacer(1, 6))
    e.append(Paragraph(
        "A Balatonpart utca 12. szamu tarsashaz (helyrajzi szam: 12345/A/1–24.) tulajdonosi kozossegenek "
        "rendes evi kozgyuleset az alabbi idopontban es helyszinen tartjuk meg:",
        s["body"]))

    info = [
        ["Idopont:", "2026. junius 10. (szerda), 18:00 ora"],
        ["Helyszin:", "Balatonpart utca 12., foldszinti kozos helyiseg"],
        ["Targyalas:", "Ha a megjelent tulajdonosok tobb mint felet kepviselik"],
        ["Pot-kozgyules:", "2026. junius 17. (szerda), 18:00 — azonos helyen, azonos napirend"],
    ]
    info_tbl = Table(info, colWidths=[3.5*cm, 12*cm])
    info_tbl.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ("GRID", (0, 0), (-1, -1), 0.5, SLATE_200),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
    ]))
    e.append(info_tbl)
    e.append(Spacer(1, 14))

    e.append(Paragraph("NAPIRENDI PONTOK", s["h2"]))
    agenda = [
        ("1.", "A 2025. evi gazdalkodas elszamolasanak elfogadasa",
         "Bemutatjuk az evi penzugyi elszamolast, megvitatjuk az eltero tételeket."),
        ("2.", "A 2026. evi koltsegvetesi terv elfogadasa",
         "Terjesztjuk a kozos koltseg merteketnek meghatározasara vonatkozo tervjavaslatot."),
        ("3.", "Felujitasi alap felhasznalasanak jovahagyas — liftkabinok korszerusitese",
         "A lift 2018-ban epitett kabinjai cserere szorulnak. Ajanlatok: A) 3,2 M Ft, B) 3,6 M Ft."),
        ("4.", "A kozos kepviselo dijazasanak meghatarozasa 2026-ra",
         "Jelenlegi havi dij: 45 000 Ft. Javaslat: 52 000 Ft/ho (inflacio + munkaterhelesnovekedes)."),
        ("5.", "Egyebek — bejelentesek, tulajdonosi kerdesek",
         "Szabad napirend."),
    ]
    for num, title_str, desc in agenda:
        e.append(KeepTogether([
            Paragraph(f"{num}  {title_str}", s["h3"]),
            Paragraph(desc, s["body"]),
        ]))

    e.append(Spacer(1, 8))
    e.append(Paragraph(
        "Szavazati jogukat kepviselo utvjan is gyakorolhatjak. A meghatalmazas mintaja letoltheto "
        "a lakaskezelesi rendszerboen vagy kerheto a kozos kepviselotol.",
        s["body"]))
    e.append(Spacer(1, 6))
    e.append(Paragraph(
        "A hatarozatkepesseghez szukseges a tulajdoni hanyad tobb mint feleket kepviselo tulajdonosok "
        "jelenlete, vagy kepviselete (Ptk. 5:84. §). Ker­juk, hogy jelenleten illetve kepviselete "
        "biztositsaval a hatarzathozatalt segitsek elo.",
        s["body"]))

    e.append(Spacer(1, 20))
    e.append(HRFlowable(width="100%", thickness=0.5, color=SLATE_200, spaceAfter=10))
    e.append(Paragraph("Udvozlettel,", s["body"]))
    e.append(Paragraph("Kozos Kepviselo", s["bold"]))
    e.append(Paragraph("Balatonpart utca 12. Tarsasahaz", s["small"]))
    e.append(Paragraph("tel: +36 30 123 4567  |  e-mail: kozoskepoviselo@panellako.hu", s["small"]))

    doc.build(e)
    buf.seek(0)
    return buf.read()


def build_tuzvedelmi():
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, rightMargin=2.5*cm, leftMargin=2.5*cm,
                             topMargin=2*cm, bottomMargin=2*cm, title="Tuzvedelmi szabalyzat v2.0")
    s = styles()
    e = []
    e += header_block(s,
                      "Tuzvedelmi Szabalyzat",
                      "Balatonpart utca 12. Tarsasahaz — v2.0",
                      "2026. majus 15.",
                      "TUZV-2026-002")

    e.append(Paragraph(
        "Jogalap: 2011. evi CXXVIII. tv. 22. §, 54/2014. (XII. 5.) BM rendelet 2. melleklet",
        ParagraphStyle("law", fontName="Helvetica-Oblique", fontSize=8, textColor=SLATE_500,
                        spaceAfter=10, alignment=TA_CENTER)))

    e.append(Paragraph("1. CELOK ES HATALYOK", s["h2"]))
    e.append(Paragraph(
        "1.1. Jelen szabalyzat celja, hogy a Balatonpart utca 12. tarsasahaz teruletein a tuz- "
        "es robbanasvedeelem felteteleit, az evakuacios eljazasokat, valamint a tuzmegelozesi "
        "kotelezettsegeket rogzitse.",
        s["body"]))
    e.append(Paragraph(
        "1.2. A szabalyzat hatalya kiterjed az epulet osszes kozos teruletre (folyosok, liftakna, "
        "pince, legaro), a kulso terekre (udvari parkolasok, kerti terulet), valamint minden, "
        "az epuletben tartoskodo szemelyre.",
        s["body"]))

    e.append(Paragraph("2. TUZVEDEELMI ALAPFOGALMAK", s["h2"]))
    defs = [
        ["Fogalom", "Meghatározas"],
        ["Tuzveszely", "Olyan allapot, amelybol konnyen tuz keletkezhet"],
        ["Tuz", "Kontrolal­lan langolas, amely anyagi kart okoz"],
        ["Evakualas", "Az epuletben levo szemelyek biztonsakos eltavolitasa"],
        ["Menekules urvonal", "Az epuletbol kijutasra alkalmas, akadaly­mentes utvonal"],
        ["Tuzjelzo", "Automatikus eszköz, amely tuzet vagy füstot erezkel"],
    ]
    defs_tbl = Table(defs, colWidths=[5*cm, 10.5*cm])
    defs_tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BRAND_PRIMARY),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#fef3c7")]),
        ("GRID", (0, 0), (-1, -1), 0.5, SLATE_200),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
    ]))
    e.append(defs_tbl)
    e.append(Spacer(1, 10))

    e.append(Paragraph("3. TILTOTT CSELEKMENYEK", s["h2"]))
    tilos = [
        "Nyilt langon toreno tuzelest, grill- es kemencehasznalatot a kertben jelolt területen kivul tilos vegezni.",
        "Tuzolto keszulek, tuzjelzo, tuzcsap, tuzgato ajtok elzarasa, megrongalasa tilos.",
        "Gyulanekony anyagot (benzin, oldoszer, galiz, gyulekszal) lakasban vagy kozos teruleten tarolni tilos.",
        "Folyosoka, menekülesi utvonalakra jarmuvet, bnutoret vagy barmilyen targyat kitenni tilos.",
        "Az epuletben tuzijatekot, pirotechnikai eszkozokot haszanlni tilos.",
        "Tuzeset, tuzriado eseten a liftet haszanlni tilos.",
    ]
    for t in tilos:
        e.append(Paragraph(f"&#9679;  {t}", ParagraphStyle("bullet", fontName="Helvetica", fontSize=10,
                                                              textColor=ROSE, spaceAfter=4, leading=14,
                                                              leftIndent=12)))
    e.append(Spacer(1, 8))

    e.append(Paragraph("4. EVAKUACICO ES MENEKULES", s["h2"]))
    e.append(Paragraph(
        "4.1. Tuz eseten azonnal hivjak a 112-es segelhivot es figyelmeztessek a szomszedokat. "
        "Utana tavozzanak a legkozelebbi lepcsohazon at. Soha ne hasznaljanak liftet tuz eseten!",
        s["body"]))
    e.append(Paragraph(
        "4.2. Menekules utvonalak: minden emelet folyosojara kihelyezett menekülesi terv tartalmazza "
        "a legkozelebbi lepcso helyet, a gyülekezohely a Balatonpart utcai oldal elott jelolt "
        "teruleten van (lasd epületterkep).",
        s["body"]))

    evac = [
        ["Emelet", "Menekülési irany", "Tartalek utvonal"],
        ["Foldszint", "Fo bejaraaton / udvari kijaron at", "Garazsbehajtoon at"],
        ["1–3. emelet", "Fo lepcsohaz / udvari lepcsohaz", "Tuzlepcso (D-i fal)"],
        ["4–6. emelet", "Udvari lepcsohaz", "Tuzlepcso (D-i fal)"],
        ["Teto (tetoteri lakasok)", "Udvari lepcsohaz", "Tuzlepcso (D-i fal)"],
    ]
    evac_tbl = Table(evac, colWidths=[3.5*cm, 6.5*cm, 5.5*cm])
    evac_tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#dc2626")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#fff7ed")]),
        ("GRID", (0, 0), (-1, -1), 0.5, SLATE_200),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
    ]))
    e.append(evac_tbl)
    e.append(Spacer(1, 10))

    e.append(Paragraph("5. TUZOLTO KESZULEK HELYE ES KARBANTARTASA", s["h2"]))
    e.append(Paragraph(
        "Az epuletben ABC-tipusu porralto keszulekek a kovetkezo helyeken talalhatok: "
        "foldszinti bejarat (1 db), minden emelet kozepen (1-1 db), pincelejaro mellett (1 db). "
        "Osszes darabszam: 8 db.",
        s["body"]))
    e.append(Paragraph(
        "A keszulekeket evente egy szerviz ellenorzi. Legutolso vizsgalat: 2026. marcius 10. "
        "(szerviz bizonylat a kozos kepviseloi iratokban)",
        s["body"]))

    e.append(Spacer(1, 20))
    e.append(HRFlowable(width="100%", thickness=0.5, color=SLATE_200, spaceAfter=10))
    e.append(Paragraph("Jovahagyta: Tulajdonosi Kozosseg (2026. majus 15.) | Kozos Kepviselo", s["small"]))
    e.append(Paragraph("Kovetkezo felulvizsgalat: 2027. majus 15.", s["small"]))

    doc.build(e)
    buf.seek(0)
    return buf.read()


DOCUMENTS = [
    {
        "filename": "demo/szmsz_v3.1.pdf",
        "builder": build_szmsz,
        "content_type": "application/pdf",
    },
    {
        "filename": "demo/elszamolas_2025.pdf",
        "builder": build_elszamolas,
        "content_type": "application/pdf",
    },
    {
        "filename": "demo/kozgyules_meghivo_20260610.pdf",
        "builder": build_meghivo,
        "content_type": "application/pdf",
    },
    {
        "filename": "demo/tuzvedelmi_szabalyzat_v2.pdf",
        "builder": build_tuzvedelmi,
        "content_type": "application/pdf",
    },
]


def upload_to_supabase(path: str, data: bytes, content_type: str) -> bool:
    url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{path}"
    req = urllib.request.Request(
        url,
        data=data,
        method="POST",
        headers={
            "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
            "Content-Type": content_type,
            "x-upsert": "true",
        },
    )
    try:
        with urllib.request.urlopen(req) as resp:
            body = resp.read()
            print(f"  OK ({resp.status}): {path}")
            return True
    except urllib.error.HTTPError as ex:
        body = ex.read()
        print(f"  ERROR {ex.code}: {path} — {body[:200]}")
        return False


def main():
    if not SERVICE_ROLE_KEY:
        print("ERROR: SUPABASE_SERVICE_ROLE_KEY not set")
        sys.exit(1)

    print(f"Supabase project: {SUPABASE_URL}")
    print(f"Bucket: {BUCKET}")
    print()

    success = 0
    for doc in DOCUMENTS:
        print(f"Generating {doc['filename']} ...")
        pdf_bytes = doc["builder"]()
        print(f"  Size: {len(pdf_bytes):,} bytes")
        if upload_to_supabase(doc["filename"], pdf_bytes, doc["content_type"]):
            success += 1

    print(f"\nDone: {success}/{len(DOCUMENTS)} uploaded.")


if __name__ == "__main__":
    main()
