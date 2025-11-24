# 🎯 Talep Yönetim Sistemi

Modern, AI destekli talep yönetim platformu. Kozmetik firmaları için özelleştirilmiş, güçlü ve kullanıcı dostu bir çözüm.

## ✨ Özellikler

### 🤖 AI Destekli Akıllı Yönlendirme
- **Google Gemini AI** ile otomatik departman tespiti
- Talep içeriği analizi ve öncelik belirleme
- Otomatik etiketleme ve sınıflandırma
- %95+ güven skoruyla doğru atamalar

### 📊 Kapsamlı Dashboard
- Gerçek zamanlı istatistikler
- Departman bazlı performans metrikleri
- Talep durumu takibi
- Trend analizi ve raporlama

### ⏱️ Gelişmiş Zaman Takibi
- Talep açılış tarihi
- Atanan kişinin üzerinde kalma süresi
- İlk yanıt süresi
- Toplam çözüm süresi
- SLA uyum durumu

### 🎨 Modern ve Responsive Tasarım
- Glassmorphism efektleri
- Dark/Light mode desteği
- Gradient aksan renkleri
- Micro-animations
- Tüm cihazlarda mükemmel görünüm

### 🔐 Güvenli ve Ölçeklenebilir
- Supabase Authentication
- Row Level Security (RLS)
- Rol bazlı yetkilendirme (Admin, Departman Yöneticisi, Kullanıcı)
- Güvenli API endpoints

### 🚀 Diğer Özellikler
- Talep oluşturma ve yönetimi
- Yorum sistemi
- Dosya ekleme
- Talep geçmişi
- Etiket sistemi
- Önceliklendirme (Acil, Yüksek, Normal, Düşük)
- Departman bazlı renk kodlaması

## 🛠️ Teknoloji Stack

### Frontend
- **Next.js 15** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Shadcn/ui** - UI components
- **Framer Motion** - Animations
- **Lucide React** - Icons

### Backend
- **Supabase** - Database, Auth, Realtime, Storage
- **PostgreSQL** - Veritabanı
- **Google Gemini AI** - AI/ML (ÜCRETSİZ)

### Deployment
- **Netlify** - Hosting ve CI/CD

## 📦 Kurulum

### Gereksinimler
- Node.js 18+
- npm veya yarn
- Supabase hesabı
- Google Gemini API key (ücretsiz)

### Adım 1: Projeyi Klonlayın
\`\`\`bash
git clone <repository-url>
cd g_talep
\`\`\`

### Adım 2: Bağımlılıkları Kurun
\`\`\`bash
npm install
\`\`\`

### Adım 3: Supabase Projesini Oluşturun
1. [Supabase](https://supabase.com) hesabı oluşturun
2. Yeni bir proje oluşturun
3. SQL Editor'de \`supabase/migrations/20240101000000_initial_schema.sql\` dosyasını çalıştırın
4. Settings > API'den project URL ve anon key'i alın

### Adım 4: Google Gemini API Key Alın
1. [Google AI Studio](https://ai.google.dev/) adresine gidin
2. Ücretsiz API key oluşturun
3. API key'i kopyalayın

### Adım 5: Environment Variables
\`.env.example\` dosyasını \`.env.local\` olarak kopyalayın ve doldurun:

\`\`\`env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google Gemini AI (ÜCRETSİZ)
GOOGLE_GEMINI_API_KEY=your-gemini-api-key

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
\`\`\`

### Adım 6: Geliştirme Sunucusunu Başlatın
\`\`\`bash
npm run dev
\`\`\`

Tarayıcınızda [http://localhost:3000](http://localhost:3000) adresine gidin.

## 🚀 Deployment (Netlify)

### Adım 1: Netlify'a Bağlanın
1. [Netlify](https://netlify.com) hesabı oluşturun
2. "New site from Git" seçeneğini seçin
3. Repository'nizi bağlayın

### Adım 2: Build Ayarları
- **Build command:** \`npm run build\`
- **Publish directory:** \`.next\`

### Adım 3: Environment Variables
Netlify dashboard'da tüm environment variable'ları ekleyin (`.env.local`'daki gibi)

### Adım 4: Deploy
- "Deploy site" butonuna tıklayın
- Her commit'te otomatik deploy edilecektir

## 📊 Veritabanı Şeması

### Tablolar
- **profiles** - Kullanıcı profilleri
- **departments** - Departmanlar
- **tickets** - Talepler
- **ticket_comments** - Talep yorumları
- **ticket_attachments** - Talep ekleri
- **ticket_history** - Talep geçmişi
- **sla_rules** - SLA kuralları

### Özellikler
- Otomatik ticket number generation (TLP-YYYY-0001)
- Automatic timestamp updates
- Change history tracking
- Row Level Security (RLS)
- Foreign key constraints
- Indexes for performance

## 🎯 Kullanım

### İlk Kullanıcı Oluşturma
1. `/signup` sayfasına gidin
2. Ad soyad, e-posta ve şifre girin
3. Kayıt olun

### Admin Rolü Verme
Supabase SQL Editor'de:
\`\`\`sql
UPDATE profiles
SET role = 'admin'
WHERE id = 'user-id';
\`\`\`

### Talep Oluşturma
1. "Yeni Talep" butonuna tıklayın
2. Başlık ve açıklama girin
3. "AI ile Departman Öner" butonuna tıklayın
4. AI önerisini görün veya manuel olarak departman seçin
5. Öncelik seviyesini belirleyin
6. "Talep Oluştur" butonuna tıklayın

## 🔧 Özelleştirme

### Departman Ekleme
Supabase Dashboard > Table Editor > departments tablosuna gidin ve yeni departman ekleyin:
- name: Departman adı
- description: Açıklama
- color: Hex renk kodu (örn: #3b82f6)

### SLA Kuralları
\`sla_rules\` tablosunda departman ve öncelik bazında yanıt/çözüm sürelerini ayarlayın.

## 📝 Lisans

MIT License

## 🤝 Katkıda Bulunma

Katkılarınızı bekliyoruz! Pull request göndermekten çekinmeyin.

## 📧 İletişim

Sorularınız için issue açabilirsiniz.

---

**🎉 Talep Yönetim Sistemi ile iş süreçlerinizi modernize edin!**
