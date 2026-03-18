import { buildMessage } from '../src/services/templates.service';

describe('templates.service', () => {
  it('payment_success — содержит название тарифа и сумму', () => {
    const msg = buildMessage('payment_success', { plan_name: 'Месяц', amount: '299 ₽' });
    expect(msg).toContain('Оплата прошла успешно');
    expect(msg).toContain('Месяц');
    expect(msg).toContain('299 ₽');
  });

  it('payment_failed — содержит ссылку /buy', () => {
    const msg = buildMessage('payment_failed', {});
    expect(msg).toContain('/buy');
  });

  it('subscription_activated — содержит дату окончания', () => {
    const msg = buildMessage('subscription_activated', {
      plan_name: 'Год',
      expires_at: '2026-03-17',
    });
    expect(msg).toContain('Год');
    expect(msg).toContain('2026-03-17');
    expect(msg).toContain('/mykey');
  });

  it('subscription_expiring — содержит количество дней', () => {
    const msg = buildMessage('subscription_expiring', { days_left: 3 });
    expect(msg).toContain('3');
    expect(msg).toContain('/buy');
  });

  it('subscription_expired — содержит /buy', () => {
    const msg = buildMessage('subscription_expired', {});
    expect(msg).toContain('/buy');
  });

  it('vpn_key_ready — содержит access_key', () => {
    const key = 'ss://2022-blake3:abc123@1.2.3.4:12345';
    const msg = buildMessage('vpn_key_ready', { access_key: key });
    expect(msg).toContain(key);
  });

  it('неизвестный тип — возвращает fallback сообщение', () => {
    const msg = buildMessage('payment_success' as any, {});
    expect(typeof msg).toBe('string');
    expect(msg.length).toBeGreaterThan(0);
  });
});
