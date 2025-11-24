# Production Issues Fix - Migration Guide

## 🎯 Sorunlar ve Çözümleri

### 1. ❌ Ticket Number Duplicate Key Hatası
**Sorun:** Race condition nedeniyle aynı ticket number'ı iki kullanıcı aynı anda alabiliyor.
```
duplicate key value violates unique constraint "tickets_ticket_number_key"
```

**Kök Sebep:**
- Eski kod `COUNT(*) + 1` kullanıyordu
- İki istek aynı anda geldiğinde aynı sayıyı alıyordu

**Çözüm:**
- PostgreSQL advisory lock kullanımı (`pg_advisory_xact_lock`)
- MAX() + proper pattern matching ile güvenli sequence
- Retry mekanizması (max 10 deneme)
- Extra uniqueness check

### 2. ❌ Departman Bazlı Görünürlük
**Sorun:** Kullanıcılar kendi departmanlarındaki talepleri göremiyor.

**Çözüm:**
Yeni RLS politikası ile:
- ✅ **Admin:** Tüm talepleri görür
- ✅ **Department Manager:** Kendi departmanındaki tüm talepleri görür
- ✅ **Normal User:**
  - Kendi oluşturduğu talepler
  - Kendisine atanmış talepler
  - Kendi departmanındaki tüm talepler

### 3. ✅ Admin User Setup
**İşlem:** uguronar23@gmail.com kullanıcısını admin yaptık.

### 4. ✅ Signup Department Integration
**İyileştirme:** Kullanıcı kaydında departman bilgisi artık profile kaydediliyor.

---

## 📋 Migration Adımları

### Adım 1: Supabase SQL Editor'ı Aç
https://supabase.com/dashboard/project/qzcmrzocqbvidbrsfmux/sql/new

### Adım 2: Migration SQL'i Çalıştır
`supabase/migrations/20240103000000_fix_production_issues.sql` dosyasının içeriğini kopyala ve çalıştır.

### Adım 3: Sonuçları Kontrol Et
Migration başarılı olursa şu mesajları göreceksin:
```
SUCCESS: Admin user configured
Next ticket number format will be: TLP-2025-0001
```

---

## 🧪 Test Senaryoları

### Test 1: Ticket Number Uniqueness
```sql
-- 10 ticket aynı anda oluştur (concurrent test)
-- Her biri unique ticket_number almalı
```

### Test 2: Admin Visibility
```bash
# Admin olarak login ol (uguronar23@gmail.com)
# Tüm departmanlardan talepleri görebilmen gerekir
```

### Test 3: User Visibility
```bash
# Normal user olarak login ol
# Sadece kendi departmanındaki talepleri görmelisin
```

### Test 4: Department Selection on Signup
```bash
# Yeni kullanıcı kayıt ol
# Departman seç
# Profile'da department_id set olmalı
```

---

## 🔍 Teknik Detaylar

### Advisory Lock Kullanımı
```sql
PERFORM pg_advisory_xact_lock(hashtext('ticket_number_generation'));
```
- Transaction-level lock
- Sadece ticket number generation işlemini kilitle
- Transaction bitince otomatik unlock

### RLS Policy Architecture
```
Admin -> See All
Department Manager -> See Department Tickets
User -> See (Own + Assigned + Department) Tickets
```

### Performance Optimizations
- Index: `idx_tickets_number_pattern` (text_pattern_ops)
- Faster LIKE queries for ticket number generation
- O(1) lookup for existing ticket numbers

---

## 🚀 Deployment Checklist

- [ ] SQL Migration çalıştırıldı
- [ ] Admin user doğrulandı
- [ ] Ticket creation test edildi (multiple concurrent)
- [ ] Department visibility test edildi
- [ ] Signup flow test edildi
- [ ] Production'a deploy edildi
- [ ] Post-deployment smoke test yapıldı

---

## 📊 Monitoring

### Check Failed Ticket Creations
```sql
-- Check for any ticket creation failures in logs
SELECT * FROM tickets
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

### Check Duplicate Ticket Numbers
```sql
-- Should return 0 rows
SELECT ticket_number, COUNT(*)
FROM tickets
GROUP BY ticket_number
HAVING COUNT(*) > 1;
```

### Check User Department Assignment
```sql
-- All active users should have department_id
SELECT
    u.email,
    p.full_name,
    p.role,
    d.name as department
FROM profiles p
INNER JOIN auth.users u ON u.id = p.id
LEFT JOIN departments d ON d.id = p.department_id
WHERE p.role = 'user'
ORDER BY p.created_at DESC;
```

---

## 🔧 Rollback Plan

Eğer bir sorun olursa:

```sql
-- Restore old ticket number function
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
DECLARE
    year TEXT;
    sequence_num INTEGER;
BEGIN
    IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
        year := TO_CHAR(NOW(), 'YYYY');
        SELECT COUNT(*) + 1 INTO sequence_num
        FROM tickets
        WHERE ticket_number LIKE 'TLP-' || year || '-%';
        NEW.ticket_number := 'TLP-' || year || '-' || LPAD(sequence_num::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

⚠️ **Not:** Rollback sadece acil durumlarda kullan. Yeni migration production-tested.
