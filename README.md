# Salon Erişim Paneli

Türkiye genelinde Instagram'da aktif **2134 güzellik salonu** için WhatsApp erişim paneli (100 bölge): Maltepe 95, Ataşehir 76, Esenyurt 68, Ümraniye 63, Üsküdar 44, İstanbul 38, Türkiye 38, Pendik 32, Bağcılar 32, Sancaktepe 32, Kartal 32, Küçükçekmece 25, Gaziosmanpaşa 23, Kadıköy 23, Bursa 18, Başakşehir 16, Antalya 16, Sultangazi 15, Beylikdüzü 15, Ankara 15, Avcılar 14, Konya 14, Kayseri 14, Mersin 12, Eskişehir 12, Bahçelievler 10, Şişli 9, Bakırköy 9, İzmir 9, Gaziantep 9, Kağıthane 8, Denizli 8, Trabzon 8, Samsun 8, Esenler 7, Beşiktaş 7, Eyüpsultan 6, Tuzla 6, Şanlıurfa 6, Sakarya 6, Kocaeli 6, Adana 6, Sivas 6, Sarıyer 5, Sultanbeyli 5, Zeytinburnu 5, Fatih 5, Isparta 5, Van 5, Balıkesir 5, Manisa 5, Çekmeköy 4, Bayrampaşa 4, Aydın 4, Muğla 4, Aksaray 4, Güngören 3, Beykoz 3, Arnavutköy 3, Elazığ 3, Ordu 3, Tekirdağ 3, Erzurum 3, Kırşehir 3, Hatay 3, Zonguldak 3, Beyoğlu 2, Büyükçekmece 2, Kastamonu 2, Uşak 2, Batman 2, Malatya 2, Afyonkarahisar 2, Diyarbakır 2, Çanakkale 2, Kahramanmaraş 2, Çorum 2, Giresun 2, Rize 2, Yalova 2, Karaman 2, Silivri 1, Çatalca 1, Burdur 1, Adıyaman 1, Bilecik 1, Mardin 1, Sinop 1, Niğde 1, Kütahya 1, Bolu 1, Yozgat 1, Amasya 1.

İşaretler (Gönderildi / Deneme / Satın alım / WhatsApp yok) **ortak bir Postgres
veritabanında** tutulur — linke giren herkes aynı durumu görür, 10 saniyede bir
kendiliğinden tazelenir.

**Bir salon aynı anda birden çok işaret taşıyabilir.** Denemeye giren ve sonra
satın alan bir salonda hem “Deneme” hem “Satın alım” birlikte işaretli durur;
satırda iki rozet birden görünür ve salon her iki sayaçta da sayılır. Tek
istisna “WhatsApp yok”: onu seçmek diğer işaretleri temizler, çünkü olumsuz
sonuç satın alımla birlikte anlamlı değil.

Veritabanında bu, virgülle birleşik tek metindir (`trial,sale`). Eskiden yazılmış
tek değerli kayıtlar (`sale` gibi) olduğu gibi geçerlidir — göç gerekmez.

**Mevcut 581 işaret (489 gönderildi, 2 satın alım, 90 WhatsApp yok) ve 11 mesaj kaydı
kodun içinde gömülü.** Veritabanı boşken panel ilk açıldığında bunlar kendiliğinden yüklenir.
Veritabanın zaten doluysa dokunmaz — mevcut işaretlerin olduğu gibi kalır.

```
index.html                  panel (tek dosya, dışarıdan kütüphane yok)
                            iki sekme: Salonlar + Mesaj Kaydı
api/state.js                durumu okuma + yazma + mesaj kaydı + ilk kurulum tohumu
api/login.js                parola kontrolü
api/health.js               teşhis ucu (gizli değer göstermez)
api/_seed.js                ilk kurulumda yüklenecek 581 işaret + mesaj kayıtları
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
yap — içinde 2134 salonun telefonu var.

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

İlk açılışta panelde 92 bekleyen / 489 gönderildi / 2 satın alım / 90 WhatsApp yok
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

## Tohum (ilk kurulumdaki 581 işaret) nasıl çalışır

`api/_seed.js` içindeki işaretler ve mesaj kayıtları veritabanına **sadece bir kere**, `data->>'seeded'`
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

## Excel / CSV ile salon ekleme

Panelde **"Excel'den ekle"** düğmesi (Salonlar sekmesi, üst araç çubuğu).

- `.xlsx`, `.xls`, `.csv` kabul eder. İlk satır başlık sayılır.
- Sütunlar otomatik eşleşir; yanlışsa açılır menülerden elle seçilir.
  Zorunlu olan iki alan: **Salon adı** ve **Telefon**.
- Eklemeden önce her satır için durum gösterilir:
  `telefon geçersiz` (cep değil / eksik), `isim yok`,
  `listede zaten var`, `dosyada tekrar`.
- Açık rıza onay kutusu işaretlenmeden ekleme yapılamaz.
  İzin kaynağı ve izin tarihi sütunları varsa kayda yazılır ve panelde rozet olarak görünür.

### Nerede durur

Eklenen kayıtlar `index.html` içindeki hazır `SALONS` listesine **karışmaz**.
Veritabanında `panel_state.data.custom` altında tutulur ve `/api/state` üzerinden
(parola arkasından) gelir. Yani:

- hazır liste hiç değişmez,
- eklediğin kayıtlar statik HTML'e gömülmez,
- her kaydın yanındaki **Kaldır** düğmesi yalnızca senin eklediğin o satırı siler.

### Telefon kuralı

Sadece Türkiye cep numaraları (`5XXXXXXXXX`). `0532...`, `+90 532...`, `532 ...`
biçimlerinin hepsi kabul edilip 10 haneye indirilir. Sabit hatlar (0212/0216/0850)
WhatsApp'a uygun olmadığı için reddedilir.

### Excel okuyucu

`vendor/xlsx.full.min.js` projeyle birlikte gelir (SheetJS 0.18.5).
CDN'e bağımlı değildir, internet olmadan da çalışır.
