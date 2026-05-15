import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

interface TicketUpdateEmailProps {
  recipientName: string;
  ticketTitle: string;
  ticketLocation: string;
  oldStatus: string;
  newStatus: string;
  buildingName: string;
  dashboardUrl: string;
  unsubscribeUrl: string;
}

const statusLabels: Record<string, { label: string; color: string; bg: string }> = {
  uj: { label: 'Új', color: '#1e40af', bg: '#dbeafe' },
  folyamatban: { label: 'Folyamatban', color: '#92400e', bg: '#fef3c7' },
  varakozik: { label: 'Várakozik', color: '#6d28d9', bg: '#ede9fe' },
  lezarva: { label: 'Lezárva', color: '#065f46', bg: '#d1fae5' },
};

export function TicketUpdateEmail({
  recipientName,
  ticketTitle,
  ticketLocation,
  oldStatus,
  newStatus,
  buildingName,
  dashboardUrl,
  unsubscribeUrl,
}: TicketUpdateEmailProps) {
  const newStatusMeta = statusLabels[newStatus] ?? { label: newStatus, color: '#333', bg: '#f3f4f6' };
  const oldStatusMeta = statusLabels[oldStatus] ?? { label: oldStatus, color: '#666', bg: '#f3f4f6' };

  return (
    <Html lang="hu" dir="ltr">
      <Head />
      <Preview>Hibabejelentés frissítve: {ticketTitle}</Preview>
      <Body style={{ backgroundColor: '#f4f6f9', fontFamily: 'Arial, sans-serif', margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: '600px', margin: '20px auto', backgroundColor: '#ffffff', borderRadius: '8px', overflow: 'hidden' }}>
          <Section style={{ backgroundColor: '#1e3a5f', padding: '24px 32px' }}>
            <Text style={{ color: '#ffffff', fontSize: '22px', fontWeight: 'bold', margin: 0 }}>PanelLakó</Text>
            <Text style={{ color: '#a0c4e8', fontSize: '13px', margin: '4px 0 0 0' }}>Hibabejelentés státuszfrissítés</Text>
          </Section>
          <Section style={{ padding: '24px 32px' }}>
            <Text style={{ margin: '0 0 16px 0', fontSize: '15px', color: '#333' }}>
              Kedves <strong>{recipientName}</strong>!
            </Text>
            <Text style={{ fontSize: '15px', color: '#333', lineHeight: '1.6' }}>
              A következő hibabejelentés státusza megváltozott a <strong>{buildingName}</strong> épületben:
            </Text>
            <Section style={{ backgroundColor: '#f8fafc', borderRadius: '8px', padding: '16px', margin: '16px 0', border: '1px solid #e2e8f0' }}>
              <Text style={{ margin: '0 0 8px 0', fontWeight: 'bold', fontSize: '16px', color: '#1e3a5f' }}>{ticketTitle}</Text>
              <Text style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#64748b' }}>📍 {ticketLocation}</Text>
              <Text style={{ margin: 0, fontSize: '13px', color: '#555' }}>
                <span style={{ backgroundColor: oldStatusMeta.bg, color: oldStatusMeta.color, padding: '2px 10px', borderRadius: '12px', fontWeight: 'bold' }}>
                  {oldStatusMeta.label}
                </span>
                {' → '}
                <span style={{ backgroundColor: newStatusMeta.bg, color: newStatusMeta.color, padding: '2px 10px', borderRadius: '12px', fontWeight: 'bold' }}>
                  {newStatusMeta.label}
                </span>
              </Text>
            </Section>
          </Section>
          <Section style={{ padding: '0 32px 24px 32px' }}>
            <Button href={dashboardUrl} style={{ backgroundColor: '#1e3a5f', color: '#ffffff', padding: '12px 24px', borderRadius: '6px', fontSize: '14px', fontWeight: 'bold', textDecoration: 'none', display: 'inline-block' }}>
              Megtekintés a dashboardon
            </Button>
          </Section>
          <Hr style={{ borderColor: '#e0e0e0', margin: '0 32px' }} />
          <Section style={{ padding: '16px 32px' }}>
            <Text style={{ fontSize: '12px', color: '#888', margin: 0 }}>
              <Link href={unsubscribeUrl} style={{ color: '#1e3a5f' }}>Leiratkozás</Link>
              {' '}· © {new Date().getFullYear()} PanelLakó
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default TicketUpdateEmail;
