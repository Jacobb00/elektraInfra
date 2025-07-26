# 🌐 Azure Terraformer Otomasyon Aracı

Bu proje, kullanıcıdan alınan Azure kimlik bilgileri ile Azure kaynaklarını analiz eder ve seçilen kaynaklar için **Terraform kodlarını otomatik olarak üretir**. Proje, Terraformer ve Azure SDK kullanılarak geliştirilmiştir.

---

## 🚀 1. Uygulama Başlatma

- Frontend: `http://localhost:3001`
- Backend: `http://localhost:5000`
- Public ip: http://44.222.242.231:3001

Kullanıcı, arayüz üzerinden uygulamaya erişerek Azure'a bağlanabilir ve Terraform kodlarını oluşturabilir.

---

## 🔐 2. Azure Bağlantısı (Login)

- Kullanıcı **"Connect to Azure"** butonuna tıklar.
- Sistem, **Azure Interactive Browser Credential** ile kimlik doğrulaması yapar.
- **Azure CLI default client ID** ile bağlantı kurulur.
- Başarılı bağlantı sonrası, kullanıcıya ait **Azure abonelikleri** listelenir.

---

## 📦 3. Abonelik Seçimi

- Kullanıcı, dropdown üzerinden Azure aboneliğini seçer.
- Sistem, seçilen abonelik için **Azure Resource Management API** ile **resource group** listesini çeker.
- Resource grupları **lokasyon bilgisiyle birlikte** kullanıcıya sunulur.

---

## 📁 4. Kaynak Grubu Seçimi

Kullanıcı bir kaynak grubu seçtiğinde sistem arka planda iki işlemi paralel yapar:

- 📚 **Resource Types:** Mevcut kaynak türlerini listeler.
- 🧩 **Individual Resources:** Bireysel kaynakları listeler.

---

## ⚙️ 5. Seçim Modu Belirleme

Kullanıcı iki seçim modundan birini tercih eder:

### A) Resource Types Modu
- Kaynak türüne göre toplu seçim yapılır (örn: tüm VM'ler, tüm Storage Account'lar).
- Desteklenen türler:
  - Virtual Machine
  - Storage Account
  - SQL Database
  - Key Vault
  - Network Security Group
  - ve daha fazlası

### B) Individual Resources Modu
- Kaynaklar tek tek seçilir.
- Her bir kaynak için:
  - Ad
  - Lokasyon
  - Tür bilgisi gösterilir.
- Kaynak türlerine göre gruplandırılmış görünüm sunulur.

---

## ✅ 6. Kaynak Seçimi

- Kullanıcı, checkbox'lar ile istedikleri kaynakları seçer.
- En az bir kaynak seçilmesi zorunludur.

---

## 🛠️ 7. Terraform Kodu Üretimi

"Generate Terraform Code" butonuna tıklandığında sistem arka planda şu işlemleri yapar:

- Terraformer CLI çalıştırılır.
- Azure CLI authentication ile oturum açılır.
- Seçilen kaynaklar için `*.tf` dosyaları oluşturulur.
- Post-processing adımları:
  - `fixTerraformProviderFormat`: Provider tanımını modern formata çevirir.
  - `fixMissingTerraformArguments`: Azure API'den eksik argument'leri tamamlar.

---

## 📦 8. Dosya İndirme

- Oluşturulan Terraform dosyaları **ZIP** formatında paketlenir.
- Otomatik olarak **{ResourceGroupName}.zip** adıyla indirilir.

ZIP içeriği:

- `provider.tf`
- Kaynaklara özel `.tf` dosyaları
- `terraform.tfstate` dosyaları

---

## 📽️ Örnek Video

Uygulamanın kullanımını gösteren örnek video:

[📺 Videoyu İzle](https://streamable.com/zz37q8)

## 🎯 9. Sonuç

Kullanıcı ZIP dosyasını açtıktan sonra:

```bash
terraform init
terraform plan
