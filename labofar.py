#!/usr/bin/env python3
"""
LABOFAR (AEMPS) -> xlsx

Registro 1: entidades de distribucion  (mayoristas / por contrato / aduaneros)
            El nº de autorizacion NO esta en el listado -> hay que abrir la ficha
            de cada instalacion.
Registro 2: laboratorios farmaceuticos (fabricantes-importadores / titulares)
            El nº de autorizacion YA viene en el listado -> solo paginar.

Uso:
    python labofar.py --debug-ficha       # inspeccionar UNA ficha y ver los campos
    python labofar.py                     # ejecucion completa -> labofar.xlsx
"""

import argparse
import re
import sys
import time

import pandas as pd
import requests
from bs4 import BeautifulSoup

BASE = "https://labofar.aemps.es/labofar/registro"
URL_DIST = f"{BASE}/entidadesDistribucion/consulta.do"
URL_LAB = f"{BASE}/farmaceutico/consulta.do"

ENCODING = "ISO-8859-1"          # OJO: no es UTF-8
PAUSA = 0.5                       # segundos entre peticiones
TIMEOUT = 30

HEADERS = {
    "User-Agent": "Mozilla/5.0 (verificacion de proveedores - contacto: tu@email.com)",
    "Content-Type": "application/x-www-form-urlencoded",
}

# ids de paginacion de displaytag (salen del HTML: d-XXXXXXX-p)
PAG_DIST = "d-1334227-p"
PAG_LAB = "d-567695-p"

RE_DETALLE = re.compile(r"detalle\(\s*'([^']+)'\s*,\s*'([^']+)'\s*\)")
RE_DETALLE_LAB = re.compile(r"detalle\(\s*'([^']+)'\s*\)")
RE_MIA = re.compile(r"^\d{3,6}$")
RE_AUT_NAC = re.compile(r"^\d{3,6}[A-Za-z]?$")


def nueva_sesion():
    s = requests.Session()
    s.headers.update(HEADERS)
    return s


def post(sesion, url, data):
    """POST + decodificacion correcta. Devuelve BeautifulSoup."""
    r = sesion.post(url, data=data, timeout=TIMEOUT)
    r.raise_for_status()
    r.encoding = ENCODING
    return BeautifulSoup(r.text, "html.parser")


def total_paginas(sopa):
    """'461 filas, mostrando desde 1 a 50.' -> 10 paginas."""
    txt = sopa.get_text(" ", strip=True)
    m = re.search(r"([\d.]+)\s+filas.*?desde\s+(\d+)\s+a\s+(\d+)", txt)
    if not m:
        return 1
    total = int(m.group(1).replace(".", ""))
    por_pagina = int(m.group(3)) - int(m.group(2)) + 1
    return max(1, -(-total // por_pagina))


RE_CIF = re.compile(r"^[A-Z]\d{7}[A-Z0-9]$|^\d{8}[A-Z]$", re.I)


def filas_listado(sopa):
    """Extrae filas reales evitando las tablas envoltorio del layout.

    Se ancla en los enlaces detalle(...) y valida que la 2a celda sea un CIF,
    lo que descarta las filas-contenedor que traen el formulario entero.
    """
    filas, vistos = [], set()
    for enlace in sopa.find_all("a", href=RE_DETALLE):
        tr = enlace.find_parent("tr")
        if tr is None:
            continue
        tds = tr.find_all("td", recursive=False) or tr.find_all("td")
        if len(tds) < 5:
            continue
        cif = tds[1].get_text(" ", strip=True)
        if not RE_CIF.match(cif.replace("-", "").replace(" ", "")):
            continue
        cempr_id, instal_id = RE_DETALLE.search(enlace["href"]).groups()
        if instal_id in vistos:
            continue
        vistos.add(instal_id)
        filas.append({
            "empresa": tds[0].get_text(" ", strip=True),
            "cif": cif,
            "instalacion": tds[2].get_text(" ", strip=True),
            "direccion": tds[3].get_text(" ", strip=True),
            "provincia": tds[4].get_text(" ", strip=True),
            "cempr_id": cempr_id,
            "instalacion_id": instal_id,
        })
    return filas


# ---------------------------------------------------------------- REGISTRO 1

PAYLOAD_DIST = {
    "entidadDistribucion.empresa.CEmprId": "",
    "instalacion.id": "",
    "nombreBusqueda": "",
    "ccaaBusqueda": "",
    "tipoEntidadBusqueda": "",
    "ambitoEntidadBusqueda": "",
    "metodo": "detalleBusqueda",
}


def listado_distribucion(sesion):
    """Recorre las paginas y devuelve filas con los ids de cada instalacion."""
    todas, vistos = [], set()
    sopa = post(sesion, URL_DIST, PAYLOAD_DIST)
    paginas = total_paginas(sopa)
    print(f"[dist] {paginas} paginas")

    for pagina in range(1, paginas + 1):
        if pagina > 1:
            data = dict(PAYLOAD_DIST)
            data[PAG_DIST] = str(pagina)
            data["displaytag-pagination"] = "true"
            sopa = post(sesion, URL_DIST, data)
            time.sleep(PAUSA)

        nuevas = 0
        for fila in filas_listado(sopa):
            if fila["instalacion_id"] in vistos:
                continue
            vistos.add(fila["instalacion_id"])
            todas.append(fila)
            nuevas += 1
        print(f"  pagina {pagina}/{paginas} -> +{nuevas} (total {len(todas)})")

    return todas


def campos_ficha(sesion, cempr_id, instalacion_id):
    """Abre la ficha de una instalacion y devuelve ({etiqueta: valor}, sopa).

    Clave: muchos inputs NO tienen atributo name (p.ej. el numero de
    autorizacion). La etiqueta esta en el <td> anterior al que contiene
    el input, asi que emparejamos por posicion en la fila.
    """
    data = dict(PAYLOAD_DIST)
    data["entidadDistribucion.empresa.CEmprId"] = cempr_id
    data["instalacion.id"] = instalacion_id
    data["metodo"] = "detalleEntidad"
    sopa = post(sesion, URL_DIST, data)

    campos = {}

    # a) etiqueta (<td> previo) -> valor (<input class="campo_texto">)
    for campo in sopa.find_all("input", class_="campo_texto"):
        celda = campo.find_parent("td")
        if celda is None:
            continue
        etiqueta_td = celda.find_previous_sibling("td")
        if etiqueta_td is None:
            continue
        etiqueta = etiqueta_td.get_text(" ", strip=True)
        if etiqueta:
            campos.setdefault(etiqueta.rstrip(":").strip(), campo.get("value", ""))

    # b) inputs con name, por si algun campo no sigue el patron anterior
    for campo in sopa.find_all(["input", "textarea"]):
        clave = campo.get("name") or campo.get("id")
        if not clave:
            continue
        if campo.name == "input" and campo.get("type", "text").lower() in (
                "submit", "button", "image", "checkbox", "radio"):
            continue
        valor = campo.get_text(strip=True) if campo.name == "textarea" else campo.get("value", "")
        if valor:
            campos.setdefault(clave, valor)

    # c) ambitos: importan las casillas marcadas, no su value fijo "S"
    for campo in sopa.find_all("input", type="checkbox"):
        nombre = (campo.get("name") or "").lower()
        if "instahumana" in nombre:
            campos["_uso_humano"] = "Si" if campo.has_attr("checked") else "No"
        elif "instaveterinaria" in nombre:
            campos["_uso_veterinario"] = "Si" if campo.has_attr("checked") else "No"

    return campos, sopa


def valor_por_etiqueta(campos, *textos):
    """Devuelve el primer campo cuya etiqueta contenga alguno de los textos."""
    for texto in textos:
        objetivo = _plano(texto)
        for etiqueta, valor in campos.items():
            if objetivo in _plano(etiqueta):
                return valor
    return ""


def busca_autorizacion(campos):
    """Localiza el nº de autorizacion por etiqueta visible o por name del input."""
    for etiqueta, valor in campos.items():
        if "numero de autorizacion" in _plano(etiqueta):
            return etiqueta, valor
    for etiqueta, valor in campos.items():
        plano = _plano(etiqueta)
        if "autoriz" in plano and "certificad" not in plano:
            return etiqueta, valor
    return None, None


def _plano(texto):
    """minusculas y sin acentos, para comparar etiquetas sin sorpresas."""
    import unicodedata
    t = unicodedata.normalize("NFD", texto.lower())
    return "".join(c for c in t if unicodedata.category(c) != "Mn")


def registro_distribucion(sesion, limite=None):
    filas = listado_distribucion(sesion)
    if limite:
        filas = filas[:limite]

    print(f"[dist] abriendo {len(filas)} fichas...")
    etiqueta_usada = None

    for i, fila in enumerate(filas, 1):
        try:
            campos, _ = campos_ficha(sesion, fila["cempr_id"], fila["instalacion_id"])
            etiqueta, valor = busca_autorizacion(campos)
            fila["n_autorizacion"] = valor or ""
            fila["tipo_entidad"] = valor_por_etiqueta(campos, "Tipo de entidad")
            fila["fecha_modificacion"] = valor_por_etiqueta(
                campos, "Fecha ultima modificacion", "Fecha última modificación")
            fila["razon_social"] = valor_por_etiqueta(campos, "Razon social", "Razón social")
            fila["uso_humano"] = campos.get("_uso_humano", "")
            fila["uso_veterinario"] = campos.get("_uso_veterinario", "")
            if etiqueta and not etiqueta_usada:
                etiqueta_usada = etiqueta
                print(f"  campo detectado: '{etiqueta}' -> ej. {valor!r}")
        except Exception as e:                      # una ficha rota no tumba el lote
            fila["n_autorizacion"] = ""
            fila["error"] = str(e)[:120]
        if i % 25 == 0:
            print(f"  {i}/{len(filas)}")
        time.sleep(PAUSA)

    sin_dato = sum(1 for f in filas if not f.get("n_autorizacion"))
    if sin_dato:
        print(f"  AVISO: {sin_dato} filas sin nº de autorizacion")
    else:
        print(f"  OK: las {len(filas)} filas tienen nº de autorizacion")

    columnas = ["empresa", "cif", "n_autorizacion", "tipo_entidad", "instalacion",
                "direccion", "provincia", "razon_social", "uso_humano",
                "uso_veterinario", "fecha_modificacion", "cempr_id", "instalacion_id"]
    df = pd.DataFrame(filas)
    return df[[c for c in columnas if c in df.columns]]


# ---------------------------------------------------------------- REGISTRO 2

def payload_lab(ambito):
    return {
        "laboratorioBusqueda.nombre": "",
        "laboratorioBusqueda.formasFabricHyVSelecc": "",
        "laboratorioBusqueda.formasFabricISelecc": "",
        "laboratorioBusqueda.certificacionlotes": "",
        "idEmpresa": "",
        "ambito": ambito,
        "nombreBusqueda": "",
        "laboratorioBusqueda.ccaa": "",
        "d-567695-o": "",
        "d-567695-s": "",
        "metodo": "detalleBusqueda",
    }


def filas_laboratorios(sopa):
    """Filas del registro de laboratorios, evitando las tablas envoltorio.

    Se ancla en detalle('12245') y valida que MIA y nº de autorizacion
    tengan formato de codigo (6775 / 6775E).
    """
    filas, vistos = [], set()
    for enlace in sopa.find_all("a", href=RE_DETALLE_LAB):
        tr = enlace.find_parent("tr")
        if tr is None:
            continue
        tds = tr.find_all("td", recursive=False) or tr.find_all("td")
        if len(tds) < 3:
            continue
        mia = tds[1].get_text(" ", strip=True)
        autorizacion = tds[2].get_text(" ", strip=True)
        if not RE_MIA.match(mia) or not RE_AUT_NAC.match(autorizacion):
            continue
        lab_id = RE_DETALLE_LAB.search(enlace["href"]).group(1)
        if lab_id in vistos:
            continue
        vistos.add(lab_id)
        filas.append({
            "empresa": tds[0].get_text(" ", strip=True),
            "mia": mia,
            "n_autorizacion": autorizacion,
            "lab_id": lab_id,
        })
    return filas


def registro_laboratorios(sesion, ambito="mia"):
    """Fabricantes/importadores. El nº de autorizacion ya viene en la tabla."""
    base = payload_lab(ambito)
    todas, vistos = [], set()

    sopa = post(sesion, URL_LAB, base)
    paginas = total_paginas(sopa)
    print(f"[lab:{ambito}] {paginas} paginas")

    for pagina in range(1, paginas + 1):
        if pagina > 1:
            data = dict(base)
            data[PAG_LAB] = str(pagina)
            data["displaytag-pagination"] = "true"
            sopa = post(sesion, URL_LAB, data)
            time.sleep(PAUSA)

        nuevas = 0
        for fila in filas_laboratorios(sopa):
            if fila["lab_id"] in vistos:
                continue
            vistos.add(fila["lab_id"])
            fila["ambito"] = ambito
            todas.append(fila)
            nuevas += 1
        print(f"  pagina {pagina}/{paginas} -> +{nuevas} (total {len(todas)})")

    return pd.DataFrame(todas,
                        columns=["empresa", "mia", "n_autorizacion", "ambito", "lab_id"])


# ---------------------------------------------------------------- debug

def debug_ficha(sesion):
    """Inspecciona UNA ficha real y vuelca TODO: inputs, ocultos, selects y contexto."""
    filas = listado_distribucion(sesion)
    print(f"\n[dist] filas validas: {len(filas)}  (deberian ser 461)")
    fila = filas[0]
    print(f"\nFicha de: {fila['empresa']} / {fila['instalacion']}")
    print(f"ids: {fila['cempr_id']} , {fila['instalacion_id']}\n")

    campos, sopa = campos_ficha(sesion, fila["cempr_id"], fila["instalacion_id"])
    crudo = str(sopa)
    with open("ficha_debug.html", "w", encoding="utf-8") as fh:
        fh.write(crudo)
    print("HTML crudo -> ficha_debug.html\n")

    print("=== TODOS los inputs (incluidos ocultos) ===")
    for campo in sopa.find_all("input"):
        clave = campo.get("name") or campo.get("id") or "(sin nombre)"
        tipo = campo.get("type", "text")
        valor = campo.get("value", "")
        if valor:
            print(f"  [{tipo:8}] {clave!r:55} = {valor!r}")

    print("\n=== selects ===")
    for sel in sopa.find_all("select"):
        clave = sel.get("name") or sel.get("id") or "(sin nombre)"
        elegido = sel.find("option", selected=True)
        texto = elegido.get_text(strip=True) if elegido else "(ninguno)"
        valor = elegido.get("value", "") if elegido else ""
        print(f"  {clave!r:55} = {texto!r} (value={valor!r})")

    print("\n=== contexto de 'autorizaci' en el HTML ===")
    bajo = crudo.lower()
    pos, encontrados = 0, 0
    while encontrados < 3:
        i = bajo.find("autorizaci", pos)
        if i == -1:
            break
        print(f"\n--- ocurrencia {encontrados + 1} (offset {i}) ---")
        print(crudo[max(0, i - 900):i + 900])
        pos, encontrados = i + 10, encontrados + 1
    if not encontrados:
        print("  (no aparece la palabra en el HTML: se carga por JavaScript)")

    etiqueta, valor = busca_autorizacion(campos)
    print(f"\n--> Numero de autorizacion: {etiqueta} = {valor}")


# ---------------------------------------------------------------- main

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--debug-ficha", action="store_true",
                    help="inspecciona una sola ficha y sale")
    ap.add_argument("--limite", type=int, help="procesar solo N instalaciones")
    ap.add_argument("--salida", default="labofar.xlsx")
    args = ap.parse_args()

    sesion = nueva_sesion()

    if args.debug_ficha:
        debug_ficha(sesion)
        return

    df_dist = registro_distribucion(sesion, limite=args.limite)
    df_mia = registro_laboratorios(sesion, ambito="mia")

    with pd.ExcelWriter(args.salida, engine="openpyxl") as xls:
        df_dist.to_excel(xls, sheet_name="entidades_distribucion", index=False)
        df_mia.to_excel(xls, sheet_name="laboratorios_mia", index=False)

    print(f"\nOK -> {args.salida}")
    print(f"  entidades de distribucion: {len(df_dist)}")
    print(f"  laboratorios (mia):        {len(df_mia)}")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(1)