import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

interface AnnouncementEmailProps {
  buildingName: string;
  buildingAddress: string;
  announcementTitle: string;
  announcementContent: string;
  category?: string;
  senderName: string;
  unsubscribeUrl: string;
  dashboardUrl?: string;
}

const categoryLabels: Record<string, string> = {
  tarsashazi_kozlony: '📋 Társasházi közlöny',
  keruleti_hir: '🏙️ Kerületi hír',
  uzemeltetes: '🔧 Üzemeltetés',
  biztonsag: '🔒 Biztonság',
  egyeb: '📌 Hirdetmény',
};

export function AnnouncementEmail({
  buildingName,
  buildingAddress,
  announcementTitle,
  announcementContent,
  category = 'egyeb',
  senderName,
  unsubscribeUrl,
  dashboardUrl = 'https://app.panellako.hu',
}: AnnouncementEmailProps) {
  const categoryLabel = categoryLabels[category] ?? '📌 Hirdetmény';

  return (
    <Html lang="hu" dir="ltr">
      <Head />
      <Preview>{buildingName}: {announcementTitle}</Preview>
      <Body style={{ backgroundColor: '#f4f6f9', fontFamily: 'Arial, sans-serif', margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: '600px', margin: '20px auto', backgroundColor: '#ffffff', borderRadius: '8px', overflow: 'hidden' }}>
          <Section style={{ backgroundColor: '#1e3a5f', padding: '24px 32px' }}>
            <Text style={{ color: '#ffffff', fontSize: '22px', fontWeight: 'bold', margin: 0 }}>PanelLakó</Text>
            <Text style={{ color: '#a0c4e8', fontSize: '13px', margin: '4px 0 0 0' }}>Társasházi kezelő platform</Text>
          </Section>
          <Section style={{ backgroundColor: '#eef2f7', padding: '12px 32px', borderBottom: '1px solid #dde3ed' }}>
            <Text style={{ margin: 0, fontSize: '13px', color: '#555' }}>
              🏢 <strong>{buildingName}</strong> — {buildingAddress}
            </Text>
          </Section>
          <Section style={{ padding: '20px 32px 0 32px' }}>
            <Text style={{ display: 'inline-block', backgroundColor: '#e8f0fe', color: '#1e3a5f', fontSize: '12px', fontWeight: 'bold', padding: '4px 12px', borderRadius: '12px', margin: 0 }}>
              {categoryLabel}
            </Text>
          </Section>
          <Section style={{ padding: '16px 32px 24px 32px' }}>
            <Heading as="h1" style={{ fontSize: '20px', color: '#1e3a5f', margin: '0 0 16px 0', lineHeight: '1.3' }}>
              {announcementTitle}
            </Heading>
            <Text style={{ fontSize: '15px', color: '#333', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>
              {announcementContent}
            </Text>
          </Section>
          <Section style={{ padding: '0 32px 24px 32px' }}>
            <Button href={dashboardUrl} style={{ backgroundColor: '#1e3a5f', color: '#ffffff', padding: '12px 24px', borderRadius: '6px', fontSize: '14px', fontWeight: 'bold', textDecoration: 'none', display: 'inline-block' }}>
              Megnyitás a PanelLakóban
            </Button>
          </Section>
          <Hr style={{ borderColor: '#e0e0e0', margin: '0 32px' }} />
          <Section style={{ padding: '16px 32px 24px 32px' }}>
            <Text style={{ fontSize: '13px', color: '#555', margin: '0 0 4px 0' }}>
              Feladó: <strong>{senderName}</strong>
            </Text>
            <Text style={{ fontSize: '12px', color: '#888', margin: '8px 0 0 0' }}>
              Ez az üzenet automatikusan lett kiküldve a PanelLakó rendszer által.{' '}
              <Link href={unsubscribeUrl} style={{ color: '#1e3a5f' }}>Leiratkozás</Link>
            </Text>
            <Text style={{ fontSize: '11px', color: '#aaa', marginTop: '8px' }}>
              © {new Date().getFullYear()} PanelLakó — Minden jog fenntartva.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default AnnouncementEmail;
