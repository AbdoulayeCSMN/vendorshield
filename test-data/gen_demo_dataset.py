"""Génère un jeu de DÉMO propre et cohérent (industrie/manufacturing) :
   - demo-suppliers.csv  : ~26 fournisseurs curés (scores cohérents, contrats)
   - demo-deliveries.csv : historique de livraisons par fournisseur (pour le ML)
Importer dans l'app : Imports -> Fiches fournisseurs (demo-suppliers.csv),
puis Imports -> Livraisons (demo-deliveries.csv)."""

import csv
import random
from datetime import date, timedelta

random.seed(7)
TODAY = date(2026, 6, 21)

# tier -> (global de base) ; les autres scores oscillent autour
TIER = {"A": 86, "B": 73, "C": 57, "D": 40}

# (name, cc, country, city, category, criticality, sole_source, tier, spend€, employees, founded, rating, contract_end)
S = [
    ("Bayerische Präzisionstechnik", "DE", "Allemagne", "Munich", "components", "high", False, "A", 4200000, 1800, 1962, "A", "2027-09-30"),
    ("Rhein Stahlwerke", "DE", "Allemagne", "Duisburg", "raw_materials", "high", False, "A", 6100000, 5200, 1948, "A-", "2028-03-31"),
    ("Nippon Seimitsu KK", "JP", "Japon", "Nagoya", "components", "critical", True, "A", 3800000, 2400, 1971, "A", "2027-12-31"),
    ("Lombardia Cuscinetti", "IT", "Italie", "Milan", "components", "medium", False, "B", 1700000, 640, 1985, "BBB", "2026-12-15"),
    ("Iberia Composites", "ES", "Espagne", "Valence", "raw_materials", "medium", False, "B", 1450000, 410, 1999, "BBB+", "2027-06-30"),
    ("Polska Elektronika SA", "PL", "Pologne", "Wrocław", "technology", "high", False, "B", 2300000, 1200, 1994, "BBB", "2026-08-05"),
    ("Bohemia Plastics", "CZ", "Tchéquie", "Brno", "packaging", "low", False, "B", 980000, 520, 2003, "BBB-", "2027-02-28"),
    ("Shenzhen MicroCircuits", "CN", "Chine", "Shenzhen", "technology", "critical", True, "C", 5400000, 8600, 2006, "BB", "2026-07-12"),
    ("Guangzhou MetalWorks", "CN", "Chine", "Guangzhou", "raw_materials", "high", False, "C", 3100000, 4200, 2001, "BB-", "2027-01-20"),
    ("Anadolu Döküm", "TR", "Turquie", "Bursa", "components", "high", True, "C", 2050000, 1500, 1996, "BB", "2026-09-10"),
    ("Bharat Forge Components", "IN", "Inde", "Pune", "components", "medium", False, "C", 1850000, 3300, 1991, "BB+", "2027-04-15"),
    ("Mekong Textile & Foam", "VN", "Vietnam", "Hô Chi Minh", "raw_materials", "low", False, "C", 760000, 2100, 2010, "B+", "2026-11-30"),
    ("Atlas Logistique Maghreb", "MA", "Maroc", "Tanger", "logistics", "medium", False, "C", 1200000, 480, 2008, "BB-", "2026-07-28"),
    ("Compañía Química del Norte", "MX", "Mexique", "Monterrey", "chemicals", "high", False, "C", 2700000, 900, 1989, "BB", "2027-08-31"),
    ("Carolina Polymers", "US", "États-Unis", "Charlotte", "chemicals", "medium", False, "B", 3300000, 1100, 1977, "A-", "2028-01-31"),
    ("Midwest Bearings Co.", "US", "États-Unis", "Cleveland", "components", "medium", False, "B", 2400000, 760, 1969, "BBB+", "2027-10-31"),
    ("Hansa Verpackung", "DE", "Allemagne", "Hambourg", "packaging", "low", False, "A", 890000, 320, 1990, "A-", "2027-05-31"),
    ("Provence Énergie Solaire", "FR", "France", "Aix-en-Provence", "energy", "medium", False, "B", 1600000, 240, 2012, "BBB", "2026-12-31"),
    ("Normandie Usinage", "FR", "France", "Caen", "components", "high", True, "B", 2100000, 580, 1983, "BBB+", "2026-08-22"),
    ("Lyon Maintenance Industrielle", "FR", "France", "Lyon", "maintenance", "low", False, "B", 540000, 150, 2005, "BBB-", "2027-03-15"),
    ("Silesia Casting Group", "PL", "Pologne", "Katowice", "raw_materials", "medium", False, "C", 1750000, 1900, 1972, "BB+", "2027-07-31"),
    ("Busan Marine Coatings", "KR", "Corée du Sud", "Busan", "chemicals", "medium", False, "B", 1300000, 430, 2000, "BBB", "2027-11-30"),
    ("São Paulo Aluminio", "BR", "Brésil", "São Paulo", "raw_materials", "high", False, "C", 2200000, 2600, 1986, "BB", "2026-10-05"),
    ("Carpathian Cables SRL", "RO", "Roumanie", "Cluj", "components", "medium", False, "C", 1100000, 870, 2004, "BB", "2027-09-15"),
    ("Pennine Precision Ltd", "GB", "Royaume-Uni", "Sheffield", "components", "medium", False, "B", 1950000, 540, 1958, "BBB+", "2028-02-29"),
    ("OrientChem Industanbul", "TR", "Turquie", "Istanbul", "chemicals", "critical", True, "D", 3600000, 1300, 1993, "B", "2026-05-01"),
]


def jitter(base, lo=-8, hi=8, country_pen=0):
    return max(5, min(99, base + random.randint(lo, hi) - country_pen))


HIGH_RISK_GEO = {"CN", "TR", "IN", "VN", "BR", "MX", "RO"}


def supplier_rows():
    rows = []
    for (name, cc, country, city, cat, crit, sole, tier, spend, emp, founded, rating, c_end) in S:
        base = TIER[tier]
        geo_pen = 18 if cc in HIGH_RISK_GEO else 0
        glob = jitter(base, -4, 4)
        rows.append({
            "name": name,
            "legal_name": name + (" GmbH" if cc == "DE" else " SARL" if cc == "FR" else " Ltd"),
            "registration_number": f"{cc}{random.randint(100000, 999999)}",
            "country_code": cc,
            "country_name": country,
            "city": city,
            "category": cat,
            "criticality": crit,
            "status": "under_review" if tier == "D" else "active",
            "annual_spend_eur": spend,
            "employee_count": emp,
            "founded_year": founded,
            "credit_rating": rating,
            "is_sole_source": "true" if sole else "false",
            "website": "https://www." + name.lower().replace(" ", "").replace("é", "e").replace("ä", "a").replace("ã", "a").replace("ñ", "n").replace("ö", "o").replace("ô", "o").replace("ç", "c") + ".com",
            "contract_start_date": (date.fromisoformat(c_end) - timedelta(days=365 * 3)).isoformat(),
            "contract_end_date": c_end,
            "payment_terms_days": random.choice([30, 45, 60, 60, 90]),
            "global_score": glob,
            "financial_score": jitter(base, -6, 8),
            "operational_score": jitter(base, -10, 6),
            "geopolitical_score": jitter(base, -4, 6, geo_pen),
            "esg_score": jitter(base, -8, 8),
        })
    return rows


def delivery_rows(suppliers):
    rows = []
    for s in suppliers:
        ops = s["operational_score"]
        # plus le score opérationnel est bas, plus il y a de retards / PPM
        late_bias = (70 - ops) / 12.0           # jours de retard moyen
        ppm_base = int(max(50, (100 - ops) * 90))
        n = random.randint(12, 18)
        d = TODAY - timedelta(days=14 * n)
        for _ in range(n):
            d = d + timedelta(days=random.randint(10, 18))
            if d >= TODAY:
                break
            delay = max(0, int(random.gauss(max(0, late_bias), 3)))
            actual = d + timedelta(days=delay)
            ppm = max(0, int(random.gauss(ppm_base, ppm_base * 0.4)))
            status = "on_time" if delay <= 0 else ("late" if delay <= 5 else "very_late")
            rows.append({
                "supplier_id": s["name"],
                "planned_date": d.isoformat(),
                "actual_date": actual.isoformat(),
                "ppm": ppm,
                "quantity": random.choice([500, 1000, 1500, 2000, 2500, 5000]),
                "status": status,
            })
    return rows


sup = supplier_rows()
deliv = delivery_rows(sup)

with open("test-data/demo-suppliers.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=list(sup[0].keys()))
    w.writeheader()
    w.writerows(sup)

with open("test-data/demo-deliveries.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=list(deliv[0].keys()))
    w.writeheader()
    w.writerows(deliv)

print(f"OK: {len(sup)} fournisseurs, {len(deliv)} livraisons")
print("Contrats expirant <60j:",
      sum(1 for s in sup if 0 <= (date.fromisoformat(s['contract_end_date']) - TODAY).days <= 60))
print("Mono-source critiques:",
      sum(1 for s in sup if s['is_sole_source'] == 'true' and s['criticality'] == 'critical'))
