"""Génère un jeu de fournisseurs synthétiques cohérent → CSV + JSON + SQL.

Lancer :  python test-data/gen_synthetic_suppliers.py
Produit  :  synthetic-suppliers.csv / .json  (les données)
            wipe-and-seed-suppliers.sql        (vide + insère dans `suppliers`)
"""
import csv
import json
import random

random.seed(42)

COUNTRIES = [
    ("FR", "France", ["Lyon", "Lille", "Nantes", "Toulouse"]),
    ("DE", "Allemagne", ["Munich", "Hambourg", "Stuttgart", "Cologne"]),
    ("IT", "Italie", ["Milan", "Turin", "Bologne"]),
    ("ES", "Espagne", ["Madrid", "Barcelone", "Valence"]),
    ("PL", "Pologne", ["Varsovie", "Cracovie"]),
    ("CN", "Chine", ["Shenzhen", "Shanghai", "Canton", "Suzhou"]),
    ("IN", "Inde", ["Bangalore", "Pune", "Chennai"]),
    ("VN", "Vietnam", ["Hô-Chi-Minh", "Hanoï"]),
    ("TR", "Turquie", ["Istanbul", "Bursa", "Izmir"]),
    ("MA", "Maroc", ["Casablanca", "Tanger"]),
    ("US", "États-Unis", ["Detroit", "Austin", "Chicago"]),
    ("BR", "Brésil", ["São Paulo", "Curitiba"]),
    ("JP", "Japon", ["Nagoya", "Osaka"]),
    ("CZ", "Tchéquie", ["Prague", "Brno"]),
]

CATEGORIES = {
    "raw_materials": ["Métaux", "Aciers", "Polymères", "Alliages", "Minerais"],
    "components": ["Électronique", "Connecteurs", "Roulements", "Capteurs", "PCB"],
    "logistics": ["Transport", "Fret", "Logistique", "Entreposage"],
    "services": ["Conseil", "Ingénierie", "Maintenance", "Services"],
    "technology": ["Software", "Systèmes", "Automation", "IoT"],
    "energy": ["Énergie", "Power", "Solaire"],
    "chemicals": ["Chimie", "Adhésifs", "Revêtements", "Solvants"],
    "packaging": ["Emballage", "Packaging", "Cartonnage"],
    "maintenance": ["Maintenance", "MRO", "Outillage"],
}
SUFFIXES = ["SARL", "GmbH", "Co. Ltd", "S.p.A", "S.A.", "Inc.", "AŞ", "Pvt Ltd", "Sp. z o.o."]
CRITICALITY = ["critical", "high", "medium", "low"]
STATUS = ["active", "active", "active", "under_review", "inactive"]
RATINGS = ["AAA", "AA", "A", "BBB", "BB", "B", "CCC"]


def make_supplier(i: int) -> dict:
    cc, cname, cities = random.choice(COUNTRIES)
    cat = random.choice(list(CATEGORIES))
    word = random.choice(CATEGORIES[cat])
    name = f"{word}{random.choice(['Pro', 'Tech', 'Group', 'Industries', 'Solutions', 'Global', ''])} {random.choice(SUFFIXES)}".strip()
    crit = random.choices(CRITICALITY, weights=[2, 4, 5, 3])[0]
    # Score global biaisé : les criticités hautes ont des scores un peu plus dispersés.
    base = random.randint(22, 92)
    g = max(8, min(98, base))
    spread = lambda: max(5, min(99, g + random.randint(-18, 18)))
    spend = random.choice([80, 120, 250, 400, 600, 900, 1500, 2500, 4200]) * 1000
    return {
        "name": name,
        "legal_name": name,
        "registration_number": f"{cc}{random.randint(100000, 999999)}",
        "country_code": cc,
        "country_name": cname,
        "city": random.choice(cities),
        "category": cat,
        "criticality": crit,
        "status": random.choice(STATUS),
        "annual_spend_eur": spend,
        "employee_count": random.choice([35, 80, 150, 320, 540, 1200, 3500]),
        "founded_year": random.randint(1975, 2018),
        "credit_rating": random.choice(RATINGS),
        "is_sole_source": crit in ("critical", "high") and random.random() < 0.35,
        "global_score": g,
        "financial_score": spread(),
        "operational_score": spread(),
        "geopolitical_score": spread(),
        "esg_score": spread(),
        "website": f"https://www.{word.lower()}-{i}.example.com",
    }


suppliers = [make_supplier(i) for i in range(1, 41)]
cols = list(suppliers[0].keys())

# --- CSV ---
with open("test-data/synthetic-suppliers.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=cols)
    w.writeheader()
    w.writerows(suppliers)

# --- JSON ---
with open("test-data/synthetic-suppliers.json", "w", encoding="utf-8") as f:
    json.dump(suppliers, f, ensure_ascii=False, indent=2)


def sql_val(v):
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return str(v)
    return "'" + str(v).replace("'", "''") + "'"


rows = []
for s in suppliers:
    vals = ", ".join(sql_val(s[c]) for c in cols)
    rows.append(f"    ({vals})")
values_block = ",\n".join(rows)
col_list = ", ".join(cols)

sql = f"""-- ============================================================================
-- VendorShield — Vider la table fournisseurs et insérer 40 fournisseurs synthétiques
-- À exécuter dans Supabase → SQL Editor. ⚠️ DESTRUCTIF : supprime tous les
-- fournisseurs du compte (et en cascade leurs livraisons, évaluations, alertes,
-- prédictions...). `risk_level` est calculé automatiquement par trigger depuis
-- `global_score`.
-- ============================================================================
DO $$
DECLARE
  v_account uuid;
BEGIN
  -- Compte cible : celui des fournisseurs existants, sinon le premier compte.
  v_account := (SELECT account_id FROM public.suppliers LIMIT 1);
  IF v_account IS NULL THEN
    v_account := (SELECT id FROM public.accounts ORDER BY created_at LIMIT 1);
  END IF;

  -- Vider les fournisseurs de ce compte.
  DELETE FROM public.suppliers WHERE account_id = v_account;

  -- Insérer les fournisseurs synthétiques.
  INSERT INTO public.suppliers
    (account_id, {col_list})
  VALUES
{values_block.replace("    (", "    (v_account, ")};
END $$;
"""

with open("test-data/wipe-and-seed-suppliers.sql", "w", encoding="utf-8") as f:
    f.write(sql)

print(f"OK — {len(suppliers)} fournisseurs → CSV, JSON, SQL")
