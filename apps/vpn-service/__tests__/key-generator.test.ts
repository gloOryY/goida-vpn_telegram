import { generateOutlineKey, generateWireguardConfig } from '../src/services/key-generator.service';

describe('key-generator.service', () => {
  describe('generateOutlineKey', () => {
    it('возвращает access_key и outline_key_id', async () => {
      const result = await generateOutlineKey('http://1.2.3.4:12345', 'cert');
      expect(result.access_key).toMatch(/^ss:\/\//);
      expect(result.outline_key_id).toBeDefined();
    });

    it('каждый вызов генерирует уникальный ключ', async () => {
      const a = await generateOutlineKey('http://1.2.3.4:12345', 'cert');
      const b = await generateOutlineKey('http://1.2.3.4:12345', 'cert');
      expect(a.access_key).not.toBe(b.access_key);
    });
  });

  describe('generateWireguardConfig', () => {
    it('возвращает валидный WireGuard конфиг', async () => {
      const result = await generateWireguardConfig('5.6.7.8', 'base64pubkey==');
      expect(result.access_key).toContain('[Interface]');
      expect(result.access_key).toContain('[Peer]');
      expect(result.access_key).toContain('5.6.7.8:51820');
      expect(result.access_key).toContain('base64pubkey==');
    });

    it('каждый вызов генерирует уникальный приватный ключ', async () => {
      const a = await generateWireguardConfig('5.6.7.8', 'pubkey==');
      const b = await generateWireguardConfig('5.6.7.8', 'pubkey==');
      expect(a.access_key).not.toBe(b.access_key);
    });
  });
});
