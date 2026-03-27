# ALs Energiebilanz Card

[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=al1505&repository=HA-Energiebilanz-Card&category=plugin)

Eine hochperformante, interaktive Custom Card zur Visualisierung von Energieflüssen in Home Assistant. Perfekt für Photovoltaik, Batteriespeicher, Netzbezug und Hausverbrauch.

## ✨ Features

* 📱 **Mobile First UX:** Spezielles Touch-Design. Details öffnen sich auf dem Smartphone in einem nativen Bottom-Sheet am unteren Bildschirmrand.
* 👆 **Wischgesten (Swipe):** Wechsle Tage, Monate oder Jahre durch einfaches Wischen nach links oder rechts.
* 🖱️ **Desktop Optimiert:** Direkter Drill-Down per Mausklick in tiefere Zeiträume und smarte Hover-Tooltips.
* 🎨 **Dark Mode:** Automatische Theme-Erkennung. Farben für Light- und Dark-Mode können separat konfiguriert werden.
* 📊 **Detailansicht:** Visualisiert Autarkie, Batterie-SoC, Temperaturen und detaillierte Verbraucher (z.B. Wärmepumpe) in übersichtlichen Listen und Kuchendiagrammen.
* ⚙️ **Visueller Editor:** Vollständige Unterstützung für den UI-Editor in Home Assistant. Kein YAML-Schreiben nötig.
* ⚡ **Enterprise Performance:** Kapselung durch Shadow DOM, Schutz vor Race-Conditions und sauberes Memory Management.

## 📦 Installation

### Methode 1: HACS (Empfohlen)

Klicke einfach auf den blauen Button ganz oben. 
Alternativ:
1. Öffne HACS in Home Assistant.
2. Klicke oben rechts auf das Drei-Punkte-Menü und wähle **Benutzerdefinierte Repositories**.
3. Füge die URL dieses Repositories ein und wähle die Kategorie **Lovelace** (oder Dashboard).
4. Klicke auf Herunterladen.
5. Lade die Seite deines Browsers neu.

### Methode 2: Manuell

1. Lade die Datei `ha-energiebilanz-card.js` herunter.
2. Erstelle in Home Assistant den Ordnerpfad `/config/www/community/ha-energiebilanz-card/` (falls noch nicht vorhanden).
3. Lege die JS-Datei genau dort ab.
4. Gehe in Home Assistant zu Einstellungen -> Dashboards -> Drei-Punkte-Menü oben rechts -> Ressourcen.
5. Füge eine neue Ressource hinzu: 
   * URL: `/local/community/ha-energiebilanz-card/ha-energiebilanz-card.js`
   * Typ: `JavaScript-Modul`

## 🛠️ Konfiguration

Gehe in dein Dashboard, klicke auf "Karte hinzufügen" und suche nach "Energiebilanz". Alle Sensoren, Farben und Beschriftungen kannst du direkt in der grafischen Oberfläche einstellen.

*Hinweis: Die Karte nutzt den internen Recorder von Home Assistant. Deine Sensoren müssen historische Daten aufzeichnen (z.B. `state_class: total_increasing`).*

Screenshots:
PC:
<img width="662" height="590" alt="image" src="https://github.com/user-attachments/assets/1f4c3e73-cf00-4c83-9fba-22e85a4a1cec" />
<img width="667" height="686" alt="image" src="https://github.com/user-attachments/assets/ce341f6c-fbb8-4582-bc99-e0168bf038f6" />
<img width="750" height="657" alt="image" src="https://github.com/user-attachments/assets/c323a5a1-da90-44ff-999b-f49792db73dd" />
<img width="669" height="568" alt="image" src="https://github.com/user-attachments/assets/01c3410b-8bba-4fa4-89dc-eae186fcfa51" />
Mobile:
<img width="652" height="1280" alt="image" src="https://github.com/user-attachments/assets/edb769aa-c516-4280-9be5-5ee4d9794b7b" />
<img width="666" height="1280" alt="image" src="https://github.com/user-attachments/assets/01ec71d3-9123-4267-adc5-f65604eb4dd2" />
<img width="704" height="1280" alt="image" src="https://github.com/user-attachments/assets/b86ae8e5-49c8-4c6f-aed6-dc8d91a8b694" />
<img width="719" height="1280" alt="image" src="https://github.com/user-attachments/assets/7de0088b-c4c6-440f-b298-b10a49ce29b9" />





