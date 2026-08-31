# Salon Erişim Paneli

İstanbul'da Instagram'da aktif **416 güzellik salonu** için WhatsApp erişim paneli:
Ataşehir 75, Ümraniye 58, Esenyurt 66, Küçükçekmece 25, Pendik 30, Bağcılar 30,
Bahçelievler 10, Başakşehir 15, Sultangazi 13, Maltepe 94.

İşaretler (Gönderildi / Deneme / Satın alım / WhatsApp yok) **ortak bir Postgres
veritabanında** tutulur — linke giren herkes aynı durumu görür, 10 saniyede bir
kendiliğinden tazelenir.

**Mevcut 199 işaretin (157 gönderildi, 1 deneme, 41 WhatsApp yok) kodun içinde
gömülü.** Veritabanı boşken panel ilk açıldığında bunlar kendiliğinden yüklenir.
Veritabanın zaten doluysa dokunmaz — mevcut işaretlerin olduğu gibi kalır.

```
index.html                  panel (tek dosya, dışarıdan kütüphane yok)
                            iki sekme: Salonlar + Mesaj Kaydı
api/state.js                durumu okuma + yazma + mesaj kaydı + ilk kurulum tohumu
api/login.js                parola kontrolü
api/health.js               teşhis ucu (gizli değer göstermez)
api/_seed.js                ilk kurulumda yüklenecek 199 işaret
api/_body.js                istek gövdesini okuma yardımcısı
package.json                tek bağımlılık: pg
```

---

## 1. Neon'da veritabanı aç

1. https://console.neon.tech → **New Project** (isim: `salon-panel`, bölge: Frankfurt).
2. Açılan ekrandaki **Connection string**'i kopyala. Şuna benzer:

```
postgresql://kullanici:parola@ep-xxxx-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require
```

`-pooler` içeren (pooled) adresi kullan — serverless için doğrusu odur.

Tablo açmana gerek yok, uygulama ilk çalıştığında kendisi oluşturuyor.

---

## 2. Kodu GitHub'a koy

Zip'i aç, klasörün içine gir ve:

```bash
git init
git add .
git commit -m "salon paneli"
git branch -M main
git remote add origin https://github.com/KULLANICIADIN/salon-panel.git
git push -u origin main
```

GitHub'da `salon-panel` adında **boş** bir repo açmayı unutma. Repoyu **private**
yap — içinde 416 salonun telefonu var.

---

## 3. Vercel'e al

1. https://vercel.com/new → repoyu seç → **Import**.
2. Framework Preset: **Other** (build komutu yok, olduğu gibi yayınlanacak).
3. Deploy'dan **önce** Environment Variables kısmına iki değişken ekle:

| Name | Value |
|---|---|
| `DATABASE_URL` | Neon'dan kopyaladığın connection string |
| `PANEL_PASSWORD` | ekibe vereceğin parola, örn. `salon2026` |

4. **Deploy**. Bir dakika içinde `https://salon-panel-xxx.vercel.app` hazır.

Sonradan değişken eklersen: Settings → Environment Variables → ekle → **Redeploy**.

İlk açılışta panelde 217 bekleyen / 157 gönderildi / 1 deneme / 41 WhatsApp yok
yazıyorsa her şey yolunda demektir.

---

## Kullanım

- Link ilk açıldığında parola sorar. Bir kere girildikten sonra o tarayıcı 90 gün hatırlar.
- Satırdaki **WhatsApp'ta aç** butonu o salonun sohbetini mesaj yazılmış şekilde açar
  ve satırı otomatik "gönderildi" yapar. Gönderme kararı sende — panel senin adına
  mesaj göndermez.
- **WhatsApp yok** kırmızı, **Deneme** sarı, **Satın alım** mavi. Aynı butona tekrar
  basınca işaret kalkar.
- Üstteki beş kutu tıklanabilir filtredir; "Denemeye geçti"ye basınca sadece onlar listelenir.
- Mesaj şablonunu değiştirip **kutunun dışına tıkla** — herkes için kaydedilir.
- **Sıfırla** herkes için sıfırlar, onay sorar. (Mesaj kayıtlarına dokunmaz.)

---

## Mesaj Kaydı sekmesi

Üstteki **Mesaj Kaydı** sekmesi, hangi numaradan hangi gün kaç mesaj attığını
tutmak için. Tablo: **Tel No · Tarih · Gün · Mesaj Sayısı**.

- Numarayı istediğin gibi yaz — `0501 589 46 11`, `+90 501 589 46 11` ya da
  `5015894611` aynı kayda gider. Daha önce girdiğin numaralar kutuda öneri çıkar.
- Tarih kutusu **bugüne** ayarlı gelir; geçmiş bir gün için değiştirebilirsin.
- **Aynı numara + aynı gün** tekrar girilirse sayı mevcut kaydın üstüne eklenir.
  Yani sabah 20, akşam 15 girersen o gün için 35 görünür.
- Tablodaki sayıya tıklayıp doğrudan düzeltebilir, **Sil** ile kaydı kaldırabilirsin.
- Üstteki dört kutu: bugün gönderilen, son 7 gün, toplam ve kaç farklı numara
  kullandığın. Numara başına günlük hızını buradan takip edersin.

Kayıtlar da işaretlerle aynı veritabanında (`data->'log'`) tutulur — linke giren
herkes aynı tabloyu görür.

---

## Tohum (ilk kurulumdaki 199 işaret) nasıl çalışır

`api/_seed.js` içindeki işaretler veritabanına **sadece bir kere**, `data->>'seeded'`
alanı yokken yazılır. Yani:

- Panelde zaten bir işaret varsa **o kazanır**, tohum onu ezmez.
- Deploy'u yeniden yapsan da tohum tekrar uygulanmaz.
- **Sıfırla**'ya bastıktan sonra da geri gelmez (kasıtlı).

Tohumu bilerek yeniden yüklemek istersen Neon SQL Editor'de:

```sql
update panel_state set data = data - 'seeded' where id = 'main';
```

Sonra paneli bir kere aç — eksik işaretler geri yüklenir. Mevcut işaretlerin
korunur, tohum sadece eksikleri tamamlar.

---

## Bir şey çalışmazsa: /api/health

Önce şu adresi aç: `https://SENIN-SITEN.vercel.app/api/health`

```json
{"databaseUrlSet":true,"passwordSet":true,"passwordLength":9,"db":"baglandi"}
```

- `databaseUrlSet:false` → `DATABASE_URL` eklenmemiş ya da eklendikten sonra redeploy edilmemiş.
- `passwordSet:false` → `PANEL_PASSWORD` eklenmemiş; o durumda site şifresiz açılır.
- `passwordLength` beklediğinden farklıysa → env değerinde fazladan karakter var.
- `db:"hata: ..."` → connection string yanlış; Neon'daki **pooled** (`-pooler` içeren) adresi kullan.

Bu uç hiçbir gizli değeri göstermez, sadece "tanımlı mı / bağlanıyor mu" der.

---

## Sık karşılaşılanlar

**"DATABASE_URL tanımlı değil"** → Vercel'de değişken eklenmemiş ya da eklendikten
sonra redeploy yapılmamış.

**Parola ekranı geçilmiyor** → Ekranda gerçek sebep yazıyor ("Parola hatalı" /
"Sunucu hatası (500)" gibi). Parolanın baştaki-sondaki boşlukları hem sunucuda hem
girdide temizleniyor, o yüzden boşluk sorun değil.

**Parolayı kaldırmak** → `PANEL_PASSWORD` değişkenini sil, redeploy et. O zaman link
herkese tamamen açık olur.

**Salon eklemek/çıkarmak** → `index.html` içindeki `var SALONS = [...]` dizisini düzenle,
push et. Telefon 10 hane, başında 0 veya +90 olmadan (`5321658889`).

---

## Yerelde denemek (isteğe bağlı)

```bash
npm install
DATABASE_URL="postgresql://..." PANEL_PASSWORD="salon2026" npx vercel dev
```

`DATABASE_URL` içinde `localhost` veya `127.0.0.1` geçiyorsa SSL kendiliğinden
kapatılır, yerel bir Postgres'e de bağlanabilirsin.
