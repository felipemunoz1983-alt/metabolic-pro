#!/usr/bin/env python3
"""
calcular_aporte.py — Cálculo de aporte nutricional de una preparación.

Recibe una lista de ingredientes (gramos + macros por 100 g) y opcionalmente
un target de macros para un tiempo de comida. Devuelve:
  - macros totales y por porción
  - % de cobertura de cada macro vs target
  - factor de escala sugerido para cuadrar el target (Modo A / C)

Por qué existe: las recetas "cuadradas a ojo" se desvían 20-40 % del target.
Este script obliga a que la preparación realmente cubra los macros que el plan
necesita, que es la diferencia entre un plan que funciona y uno que no.

USO (CLI):
    python calcular_aporte.py receta.json
    python calcular_aporte.py receta.json --porciones 2

USO (import):
    from calcular_aporte import calcular
    res = calcular(ingredientes, target=target, porciones=1)

FORMATO receta.json:
{
  "porciones": 1,
  "target": {"kcal": 412, "proteina_g": 38, "carbohidrato_g": 41, "grasa_g": 11},
  "ingredientes": [
    {"alimento": "pechuga de pollo", "gramos": 120,
     "por_100g": {"kcal": 165, "proteina_g": 31, "carbohidrato_g": 0, "grasa_g": 3.6, "fibra_g": 0}},
    ...
  ]
}

Los valores por_100g se toman de references/tabla_alimentos_chile.md o de
referencias establecidas (USDA / Tabla chilena). Si un valor es estimado,
márcalo en la entrega al usuario.
"""

import json
import sys
import argparse

MACROS = ["kcal", "proteina_g", "carbohidrato_g", "grasa_g", "fibra_g"]
# kcal por gramo de cada macro (Atwater) para validación cruzada
ATWATER = {"proteina_g": 4, "carbohidrato_g": 4, "grasa_g": 9}


def sumar_ingredientes(ingredientes):
    """Suma los macros de todos los ingredientes según sus gramos."""
    total = {m: 0.0 for m in MACROS}
    detalle = []
    for ing in ingredientes:
        g = float(ing["gramos"])
        p100 = ing.get("por_100g", {})
        aporte = {}
        for m in MACROS:
            val = float(p100.get(m, 0)) * g / 100.0
            aporte[m] = round(val, 1)
            total[m] += val
        detalle.append({
            "alimento": ing.get("alimento", "?"),
            "gramos": g,
            "aporte": aporte,
        })
    total = {m: round(v, 1) for m, v in total.items()}
    return total, detalle


def validar_kcal(total):
    """Validación cruzada: kcal declaradas vs kcal calculadas por Atwater.
    Si difieren >8 %, probablemente hay un valor por_100g mal cargado."""
    kcal_atwater = sum(total.get(m, 0) * f for m, f in ATWATER.items())
    declaradas = total.get("kcal", 0)
    if declaradas == 0:
        return {"kcal_atwater": round(kcal_atwater), "coherente": None,
                "nota": "Sin kcal declaradas; usando Atwater."}
    desvio = abs(kcal_atwater - declaradas) / declaradas * 100 if declaradas else 0
    return {
        "kcal_declaradas": round(declaradas),
        "kcal_atwater": round(kcal_atwater),
        "desvio_pct": round(desvio, 1),
        "coherente": desvio <= 8,
        "nota": "OK" if desvio <= 8 else
                "Desvío >8 %: revisar algún valor por_100g mal cargado.",
    }


def fit_vs_target(por_porcion, target):
    """% de cobertura de cada macro vs target + factor de escala sugerido."""
    if not target:
        return None, None
    fit = {}
    factores = []
    for m in ["proteina_g", "carbohidrato_g", "grasa_g"]:
        t = target.get(m)
        v = por_porcion.get(m, 0)
        if t:
            fit[m.replace("_g", "_pct")] = round(v / t * 100) if t else None
            if v > 0:
                factores.append(t / v)
    # Factor de escala: prioriza cuadrar la proteína (macro clínico clave),
    # luego promedia para no distorsionar demasiado.
    factor_prot = None
    if target.get("proteina_g") and por_porcion.get("proteina_g"):
        factor_prot = round(target["proteina_g"] / por_porcion["proteina_g"], 2)
    factor_prom = round(sum(factores) / len(factores), 2) if factores else None
    sugerencia = {
        "factor_para_cuadrar_proteina": factor_prot,
        "factor_promedio": factor_prom,
        "nota": ("Multiplica los gramos por el factor de proteína para priorizar "
                 "el macro clínico; ajusta CHO/grasa con ingredientes accesorios "
                 "si quedan fuera de ±10 %."),
    }
    return fit, sugerencia


def calcular(ingredientes, target=None, porciones=1):
    porciones = max(1, int(porciones))
    total, detalle = sumar_ingredientes(ingredientes)
    por_porcion = {m: round(total[m] / porciones, 1) for m in MACROS}
    # Si no vienen kcal por_100g, estima por Atwater
    if por_porcion["kcal"] == 0:
        por_porcion["kcal"] = round(
            sum(por_porcion.get(m, 0) * f for m, f in ATWATER.items()))
        total["kcal"] = round(por_porcion["kcal"] * porciones)
    fit, sugerencia = fit_vs_target(por_porcion, target)
    return {
        "porciones": porciones,
        "total": total,
        "por_porcion": por_porcion,
        "detalle_ingredientes": detalle,
        "validacion_kcal": validar_kcal(total),
        "fit_vs_target": fit,
        "ajuste_sugerido": sugerencia,
    }


def main():
    ap = argparse.ArgumentParser(description="Cálculo de aporte de una preparación.")
    ap.add_argument("receta", help="Ruta al JSON de la receta.")
    ap.add_argument("--porciones", type=int, default=None)
    args = ap.parse_args()

    with open(args.receta, encoding="utf-8") as f:
        data = json.load(f)

    porciones = args.porciones or data.get("porciones", 1)
    res = calcular(data["ingredientes"], data.get("target"), porciones)
    print(json.dumps(res, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
