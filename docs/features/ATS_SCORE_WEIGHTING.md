# ATS Score Gewichtung Update

## Zusammenfassung

Die ATS-Score-Berechnung wurde aktualisiert, um eine gewichtete Bewertung basierend auf den wichtigsten Kategorien zu ermöglichen.

## Neue Gewichtung

| Kategorie | Gewicht | Beschreibung |
|-----------|---------|--------------|
| **Hard Skills (Technical)** | 40% | Technische Fähigkeiten, Tools, Programmiersprachen, Frameworks |
| **Soft Skills** | 20% | Kommunikation, Teamarbeit, Problemlösung, Führung |
| **Erfahrung (Experience)** | 30% | Jahre Berufserfahrung, Seniority-Level, Anforderungen |
| **Zusatzpunkte (Other)** | 10% | Zertifikate, Bildung, zusätzliche Qualifikationen |

## Implementierung

### Änderungen in `keywords.service.ts`

1. **Neue Methode `calculateWeightedScore`**:
   - Berechnet einen gewichteten Score basierend auf den Kategoriegewichten
   - Normalisiert den Score auf 0-100
   - Berücksichtigt nur Kategorien mit tatsächlichen Keywords

2. **Aktualisierte `performAnalysis` Methode**:
   - Verwendet `calculateWeightedScore` statt simple Prozentberechnung
   - Loggt sowohl gewichteten als auch einfachen Score für Vergleich

### Berechnung

Die Formel berücksichtigt nur Kategorien, die tatsächlich Keywords enthalten:

```typescript
weightedScore = Σ(categoryScore * weight) für alle Kategorien
totalWeight = Σ(weight) für Kategorien mit Keywords
finalScore = (weightedScore / totalWeight) * 100
```

**Beispiel:**
- Hard Skills: 90% match × 0.40 = 0.36
- Soft Skills: 80% match × 0.20 = 0.16
- Experience: 70% match × 0.30 = 0.21
- Certificates: 50% match × 0.10 = 0.05
- **Gewichteter Score: (0.36 + 0.16 + 0.21 + 0.05) / 1.0 = 78%**

## Tests

Neue Test-Suite `weighted-score.spec.ts` mit 5 Tests:

1. ✅ 100% Match in allen Kategorien
2. ✅ Unterschiedliche Matches über Kategorien
3. ✅ Nur Soft Skills matchen
4. ✅ Realistisches Szenario mit partiellen Matches
5. ✅ Leere Kategorien werden korrekt behandelt

## Dokumentation

Aktualisiert in `docs/ATS_OPTIMIZATION.md`:
- Neue Sektion "ATS Score Calculation"
- Erklärung der Gewichtung
- Beispielberechnung

## Vorteile

1. **Realistischere Bewertung**: Hard Skills werden stärker gewichtet als andere Faktoren
2. **Flexible Normalisierung**: Berücksichtigt nur relevante Kategorien
3. **Transparenz**: Benutzer sehen detaillierte Breakdown nach Kategorien
4. **Testbar**: Umfangreiche Tests validieren die Berechnung

## Migration

Keine Breaking Changes - die API bleibt gleich:
- `matchPercentage` gibt jetzt gewichteten Score zurück
- `categoryBreakdown` enthält weiterhin detaillierte Prozentsätze pro Kategorie
- Bestehende Endpunkte funktionieren ohne Änderungen

## Nächste Schritte

1. Frontend-Anpassungen in der ATS-Score-Anzeige (optional)
2. Monitoring der Score-Verteilung in Produktion
3. Ggf. Feintuning der Gewichte basierend auf User-Feedback
