# SolutionForTummyProblems

# 🍽️ RecipeHub – Web aplikacija za recepte

RecipeHub je moderna web aplikacija koja omogućava jednostavno pretraživanje, organizaciju i upravljanje receptima.  
Korisnik može pretraživati recepte po nazivu, sastojcima, kategorijama i tagovima, skalirati sastojke prema broju porcija, te spremati omiljene recepte.

Ova aplikacija je idealna kao osobna kuharica, ali i kao profesionalna platforma za dijeljenje recepata.

---

## 🚀 Funkcionalnosti

### 🔍 Pretraga
- Pretraga po nazivu recepta
- Pretraga po sastojcima (jedan ili više)
- Pretraga po kategorijama (doručak, deserti, glavna jela…)
- Pretraga po tagovima (npr. “brzo”, “keto”, “bez glutena”)
- Napredna AI pretraga: “što mogu skuhati s ovim sastojcima?”

### 📄 Recepti
- Prikaz pojedinačnog recepta
- Lista sastojaka (strukturirano: količina + jedinica + naziv)
- Koraci pripreme
- Vrijeme pripreme / kuhanja / pečenja
- Skaliranje sastojaka
- Upload slike recepta (opcionalno)

### 👤 Korisnici
- Registracija / login
- Spremanje omiljenih recepata
- Vlastiti recepti (CRUD)
- Automatski popis za kupovinu

---

## 🗃️ Arhitektura

Aplikacija je organizirana u dva glavna dijela:

1. **Backend API** – RESTful servis za rad s receptima  
2. **Frontend** – moderna SPA aplikacija

---

## 🧱 Tehnologije (default preporuka)

- **Backend:** Node.js + Express (ili FastAPI / Django po izboru)
- **Frontend:** React + Vite + TailwindCSS
- **Baza:** PostgreSQL (preporučeno) ili SQLite (lokalno / development)
- **ORM:** Prisma (ako koristiš Node) / SQLAlchemy (Python)
- **Autentikacija:** JWT + Refresh Tokeni
- **Pohrana slika:** lokalno ili S3 kompatibilan storage

> Napomena: Želiš li drugu tehnologiju (Laravel, .NET, Django, Firebase, Supabase)?  
> Samo reci i prilagodit ću cijeli projekt.

---

## 🗄️ Struktura baze podataka

### Tabela: `recipes`
| Naziv        | Tip         | Opis                           |
|--------------|-------------|--------------------------------|
| id           | int (PK)    | Primarni ključ                 |
| title        | text        | Naziv recepta                  |
| description  | text        | Kratki opis                    |
| prep_time    | int         | Vrijeme pripreme (min)         |
| cook_time    | int         | Vrijeme kuhanja/pečenja        |
| servings     | int         | Broj porcija                   |
| category_id  | int (FK)    | Kategorija jela                |
| image_url    | text        | URL slike recepta              |
| created_at   | timestamp   | Vrijeme unosa                  |

### Tabela: `ingredients`
| id | name |

### Tabela: `recipe_ingredients`
| id | recipe_id | ingredient_id | quantity | unit |

### Tabela: `steps`
| id | recipe_id | step_number | instruction_text |

### Tabela: `categories`
| id | name |

### Tabela: `tags`
| id | name |

### Tabela: `recipe_tags`
| id | recipe_id | tag_id |

### Tabela: `users`
| id | name | email | password_hash |

### Tabela: `favorites`
| id | user_id | recipe_id |

---

## 🧩 API rute

### 🔹 Recepti
GET /api/recipes
GET /api/recipes/:id
POST /api/recipes
PUT /api/recipes/:id
DELETE /api/recipes/:id

shell
Copy code

### 🔹 Sastojci
GET /api/ingredients

shell
Copy code

### 🔹 Pretraga
GET /api/search?query=...
GET /api/search/ingredients?items=so,meso,limun
GET /api/search/tags?tags=brzo,keto

shell
Copy code

### 🔹 Korisnici
POST /api/auth/register
POST /api/auth/login
GET /api/user/me

shell
Copy code

### 🔹 Favoriti
GET /api/favorites
POST /api/favorites/:recipe_id
DELETE /api/favorites/:recipe_id
