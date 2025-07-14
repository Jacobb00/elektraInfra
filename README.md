# 🛠️ Teleform (IaC) DevOps Generator

Teleform, kullanıcıların form tabanlı girişlerle otomatik olarak **Terraform kodları** oluşturmasını sağlayan bir **Infrastructure as Code (IaC)** üreticisidir. Amaç, teknik bilgi gerektirmeden hızlı ve güvenli altyapı kurulumlarını kolaylaştırmaktır.

---

## 🎯 Proje Hedefleri

### 1️⃣ Form Bazlı Terraform Kod Üretimi
Kullanıcılar bir web arayüzü üzerinden gerekli bilgileri girerek, otomatik olarak Terraform `.tf` dosyaları üretebilir.

### 2️⃣ Gelişmiş Şablon Desteği
Projeda  hazır şablonlar içeren bir template galerisi sunulacaktır. Bu galeri; AWS, Azure ve Google Cloud Platform (GCP) gibi çoklu bulut sağlayıcılarına ait servisleri destekleyen kapsamlı Terraform yapılarını içerecektir

---

## 🌐 Canlı Demo

- **Web Arayüzü:** [https://teleform-talya.mooo.com](https://teleform-talya.mooo.com)
- **IPv4 Adresi:** [http://44.222.242.231:3000](http://44.222.242.231:3000)

> 🚀 Bu demo üzerinden Terraform şablonları oluşturabilir ve test edebilirsiniz.

---

## 📡 Güncel API'ler

| Yöntem | Endpoint | Açıklama | Durum |
|--------|----------|----------|--------|
| `GET`  | `/api/status`           | Global API durumu             | ✅ Active |
| `GET`  | `/api/health`           | Uygulama sağlık kontrolü      | ✅ Active |
| `GET`  | `/api/aws/status`       | AWS servisi durumu            | ✅ Active |
| `POST` | `/api/aws/ec2`          | EC2 instance oluşturma        | ✅ Active |
| `POST` | `/api/aws/s3`           | S3 bucket oluşturma           | ✅ Active |
| `POST` | `/api/aws/rds`          | RDS database oluşturma        | ✅ Active |
| `GET`  | `/api/download/:fileName` | Oluşturulan `.tf` dosyasını indirme | ✅ Active |

---