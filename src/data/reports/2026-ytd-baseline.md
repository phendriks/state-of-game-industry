---
report_type: year_to_date_baseline
title: "Report Zero: 2026 year-to-date baseline"
published: 2026-09-27
period_start: 2026-01-01
period_end: 2026-09-24
ai_generated: true
human_reviewed: false
geographic_scope: Global where explicitly stated, supplemented by separately labelled United States, Europe, Asia and MENA, platform, company and tracked-workforce observations
global_representativeness: limited
independently_audited: false
summary: Consumer demand and publisher performance remained substantial through September 2026, but the benefits were unevenly distributed. Global market forecasts, regional player counts and several publisher results showed growth, while tracked layoffs exceeded 10,000 and junior vacancies represented only 5.9% of the DevQuest dataset. Capital activity recovered without establishing a corresponding improvement in studio employment.
baseline_findings:
  - id: demand_and_employment_diverge
    title: Consumer scale and employment conditions moved in different directions
    observation_ids: [global_games_revenue, global_players, confirmed_layoffs_2026, entry_level_role_share]
    limitation: Global demand forecasts and tracked employment observations cover different populations and cannot be combined into one score.
  - id: publisher_results_diverge
    title: Publisher performance varied materially
    observation_ids: [tencent_domestic_games_revenue_q2_2026, xbox_content_services_yoy, ubisoft_q1_net_bookings_yoy, capcom_quarterly_sales_yoy]
    limitation: Company reporting periods, currencies and segment definitions differ, so the observations are not a ranking.
  - id: capital_not_workforce_recovery
    title: Capital activity did not establish a workforce recovery
    observation_ids: [games_private_investment_q2_2026, games_ma_q2_2026, confirmed_layoffs_2026, open_roles]
    limitation: Deal value and vacancy or layoff counts measure different processes; no causal relationship is inferred.
  - id: junior_access_constrained
    title: Entry-level access was constrained in the tracked hiring dataset
    observation_ids: [open_roles, entry_level_role_share, stale_role_share, hiring_concentration_top_20]
    limitation: DevQuest is a tracked-company dataset rather than a census of the global games labour market.
commercially_significant_releases:
  - game: Assassin's Creed Black Flag Resynced
    publisher: Ubisoft
    parent_company: Ubisoft
    commercial_signal: 3.5 million sold-in copies during the first 14 days
    measurement_type: Reported
    source: Ubisoft Investor Center
    geography: Global publisher disclosure
    reference_period: First 14 days after release
    limitation: Sold-in copies are shipments into channels and are not necessarily consumer sell-through.
  - game: "Onimusha: Way of the Sword"
    developer: Capcom
    publisher: Capcom
    parent_company: Capcom
    release_date: 2026-09-07
    commercial_signal: More than one million units reported on launch day
    measurement_type: Reported
    source: Capcom Investor Relations
    source_url: https://www.capcom.co.jp/ir/english/news/html/e260907.html
    geography: Global publisher disclosure
    reference_period: Launch day
    limitation: The source did not provide platform, territory or sell-through detail in the stored observation.
anticipated_releases: []
research_limitations:
  - The active registries did not yield defensible, comparable public commercial evidence for approximately 20 individual 2026 releases.
  - No compatible wishlist, store-ranking or engagement series was preserved for a 20-title anticipated-games set, so no universal ranking is published.
  - The available hiring and layoff datasets are trackers rather than an official global workforce census.
  - Game-specific graduate, industry-inflow and industry-outflow baselines were not established.
metrics:
  - id: global_games_revenue
    label: Global games revenue
    value: 213.9
    display_value: $213.9B
    detail: +6.1% year over year
    scope: Global market; 2026 full year
    unit: billion US dollars
    category: Market
    kind: Forecast
    observed_on: 2026-12-31
    period_start: 2026-01-01
    period_end: 2026-12-31
    published_on: 2026-09-15
    collected_on: 2026-09-24
    source: Newzoo
    source_url: https://newzoo.com/articles/executive-summary-ggmr-2026-free-edition
    origin: Newzoo
    source_relationship: Original source
    evidence_excerpt: The global games market is forecast to generate $213.9 billion in 2026.
    carried_forward: true
  - id: global_players
    label: Global players
    value: 3.7
    display_value: 3.70B
    detail: +4.4% year over year
    scope: Global market; 2026 full year
    unit: billion players
    category: Players
    kind: Forecast
    observed_on: 2026-12-31
    period_start: 2026-01-01
    period_end: 2026-12-31
    published_on: 2026-09-15
    collected_on: 2026-09-24
    source: Newzoo
    source_url: https://newzoo.com/articles/executive-summary-ggmr-2026-free-edition
    origin: Newzoo
    source_relationship: Original source
    evidence_excerpt: The global player base is forecast to reach 3.70 billion in 2026.
    carried_forward: true
  - id: global_spenders
    label: Global spenders
    value: 1.65
    display_value: 1.65B
    detail: 2026 market forecast
    scope: Global market; 2026 full year
    unit: billion spenders
    category: Players
    kind: Forecast
    observed_on: 2026-12-31
    period_start: 2026-01-01
    period_end: 2026-12-31
    published_on: 2026-09-15
    collected_on: 2026-09-24
    source: Newzoo
    source_url: https://newzoo.com/articles/executive-summary-ggmr-2026-free-edition
    origin: Newzoo
    source_relationship: Original source
    evidence_excerpt: The number of spenders is expected to rise to 1.65 billion.
    carried_forward: true
  - id: us_games_spending_july_2026
    label: US monthly games spending
    value: 4.5
    display_value: $4.5B
    detail: Down 10% year over year
    scope: United States consumer spending; July 2026
    unit: billion US dollars
    category: Market
    kind: Reported
    observed_on: 2026-07-31
    published_on: 2026-09-01
    collected_on: 2026-09-24
    source: Circana Games
    source_url: https://www.circana.com/post/top-10-video-games
    origin: Circana Games Market Dynamics; mobile data supplied by Sensor Tower
    source_relationship: Original source
    evidence_excerpt: US video game spending fell 10% year over year to $4.5 billion.
    carried_forward: true
  - id: europe_games_revenue_2025
    label: European games revenue
    value: 29.7
    display_value: EUR29.7B
    detail: 91% digital and 9% physical
    scope: 16 European markets; calendar 2025
    unit: billion euros
    category: Market
    kind: Reported
    observed_on: 2025-12-31
    published_on: 2026-08-26
    collected_on: 2026-09-24
    source: Video Games Europe & EGDF Key Facts
    source_url: https://www.videogameseurope.eu/data-key-facts/
    origin: Video Games Europe and EGDF, All About Games 2025
    source_relationship: Original source
    evidence_excerpt: Revenue is EUR29.7 billion.
    carried_forward: true
  - id: confirmed_layoffs_2026
    label: Confirmed 2026 layoffs
    value: 10140
    display_value: 10,140
    detail: Confirmed total through 11 August
    scope: ASGC tracked announcements; 2026 year to date
    unit: count
    category: Employment
    kind: Reported
    observed_on: 2026-08-11
    published_on: 2026-08-30
    collected_on: 2026-09-24
    source: ASGC layoffs tracker
    source_url: https://layoffs.asgc.gg/
    origin: ASGC event tracker
    source_relationship: Original source
    evidence_excerpt: 10,140 confirmed through Aug 11.
    carried_forward: true
  - id: forecast_layoffs_2026
    label: Forecast 2026 layoffs
    value: 14666
    display_value: 14,666
    detail: Full-year tracker projection
    scope: ASGC model; 2026 full year
    unit: count
    category: Employment
    kind: Forecast
    observed_on: 2026-08-11
    published_on: 2026-08-30
    collected_on: 2026-09-24
    source: ASGC layoffs tracker
    source_url: https://layoffs.asgc.gg/
    origin: ASGC model
    source_relationship: Original source
    evidence_excerpt: The 2026 projection increased to 14,666.
    carried_forward: true
  - id: open_roles
    label: Tracked open roles
    value: 6171
    display_value: 6,171
    detail: Across 315 studios
    scope: DevQuest tracked companies
    unit: count
    category: Employment
    kind: Reported
    observed_on: 2026-09-22
    source: DevQuest hiring report
    carried_forward: true
  - id: entry_level_role_share
    label: Entry-level role share
    value: 5.9
    display_value: 5.9%
    detail: 366 of 6,171 tracked openings
    scope: DevQuest tracked vacancies
    unit: percent
    category: Employment
    kind: Reported
    observed_on: 2026-09-22
    source: DevQuest hiring report
    carried_forward: true
  - id: engineering_role_share
    label: Engineering role share
    value: 30.4
    display_value: 30.4%
    detail: 1,879 of 6,171 tracked openings
    scope: DevQuest tracked vacancies
    unit: percent
    category: Employment
    kind: Reported
    observed_on: 2026-09-22
    source: DevQuest hiring report
    carried_forward: true
  - id: hiring_concentration_top_20
    label: Hiring concentration among top 20 tracked companies
    value: 49
    display_value: 49%
    detail: Share of tracked openings at the top 20 tracked companies
    scope: DevQuest tracked vacancies
    unit: percent
    category: Employment
    kind: Reported
    observed_on: 2026-09-22
    source: DevQuest hiring report
    carried_forward: true
  - id: stale_role_share
    label: Listings open for 90+ days
    value: 26.5
    display_value: 26.5%
    detail: 1,634 tracked listings
    scope: DevQuest tracked vacancies
    unit: percent
    category: Employment
    kind: Reported
    observed_on: 2026-09-22
    source: DevQuest hiring report
    carried_forward: true
  - id: games_private_investment_q2_2026
    label: Games private investment
    value: 3.1
    display_value: $3.1B
    detail: 108 deals; approximately six times the value reported a year earlier
    scope: Global games private investment tracked in Q2 2026
    unit: billion US dollars
    category: Business
    kind: Reported
    observed_on: 2026-06-30
    period_start: 2026-04-01
    period_end: 2026-06-30
    published_on: 2026-07-09
    source: InvestGame reports
    origin: Aream & Co. and InvestGame Q2 2026 Gaming Market Update
    source_relationship: Original source
    carried_forward: true
  - id: games_ma_q2_2026
    label: Games M&A value
    value: 2.3
    display_value: $2.3B
    detail: 54 transactions
    scope: Global games mergers and acquisitions tracked in Q2 2026
    unit: billion US dollars
    category: Business
    kind: Reported
    observed_on: 2026-06-30
    period_start: 2026-04-01
    period_end: 2026-06-30
    published_on: 2026-07-09
    source: InvestGame reports
    origin: Aream & Co. and InvestGame Q2 2026 Gaming Market Update
    source_relationship: Original source
    carried_forward: true
  - id: xbox_content_services_yoy
    label: Xbox content & services revenue change
    value: -10
    display_value: -10.0%
    detail: Year-over-year change in FY26 Q4
    scope: Microsoft Xbox segment
    category: Corporate
    kind: Reported
    observed_on: 2026-06-30
    source: Microsoft Investor Relations
    carried_forward: true
  - id: tencent_domestic_games_revenue_q2_2026
    label: Tencent domestic games revenue
    value: 47.3
    display_value: RMB47.3B
    detail: +17% year over year
    scope: Tencent domestic games; Q2 2026
    unit: billion renminbi
    category: Corporate
    kind: Reported
    observed_on: 2026-06-30
    source: Tencent Investor Relations
    carried_forward: true
  - id: tencent_international_games_revenue_q2_2026
    label: Tencent international games revenue
    value: 18.6
    display_value: RMB18.6B
    detail: Down 0.8% reported; up 4% at constant currency
    scope: Tencent international games; Q2 2026
    unit: billion renminbi
    category: Corporate
    kind: Reported
    observed_on: 2026-06-30
    source: Tencent Investor Relations
    carried_forward: true
  - id: ubisoft_q1_net_bookings_yoy
    label: Ubisoft net bookings change
    value: -9.2
    display_value: -9.2%
    detail: Q1 year-over-year change; EUR255.8M reported
    scope: Ubisoft group
    category: Corporate
    kind: Reported
    observed_on: 2026-06-30
    source: Ubisoft Investor Center
    carried_forward: true
  - id: capcom_quarterly_sales_yoy
    label: Capcom quarterly net-sales change
    value: 54.7
    display_value: +54.7%
    detail: Year-over-year change; JPY70.41B reported
    scope: Capcom group
    category: Corporate
    kind: Reported
    observed_on: 2026-06-30
    source: Capcom Investor Relations
    carried_forward: true
  - id: ea_fy26_net_bookings_yoy
    label: Electronic Arts net bookings change
    value: 9
    display_value: +9.0%
    detail: FY26 year-over-year change
    scope: Electronic Arts group
    category: Corporate
    kind: Reported
    observed_on: 2026-03-31
    source: Electronic Arts Investor Relations
    carried_forward: true
  - id: black_flag_resynced_units_14d
    label: Black Flag Resynced sold-in copies
    value: 3.5
    display_value: 3.5M
    detail: Sold-in copies during the first 14 days
    scope: Assassin's Creed Black Flag Resynced
    unit: million units
    category: Products
    kind: Reported
    observed_on: 2026-09-23
    source: Ubisoft Investor Center
    carried_forward: true
  - id: onimusha_launch_day_units
    label: Onimusha launch-day units
    value: 1
    display_value: ">1M"
    detail: Company reported more than one million units
    scope: "Onimusha: Way of the Sword"
    unit: million units
    category: Products
    kind: Reported
    observed_on: 2026-09-07
    source: Capcom Investor Relations
    carried_forward: true
---

# Report Zero: 2026 year-to-date baseline

## Industry summary

The clearest 2026 year-to-date story is divergence rather than a single rise or decline. Demand remained large: Newzoo forecast a $213.9 billion global market, 3.70 billion players and 1.65 billion spenders for the full year. Those are forecasts, not completed-year observations. Regional evidence was less uniformly positive. Circana reported $4.5 billion of United States spending in July, down 10% year over year, while the latest European annual release described €29.7 billion of 2025 revenue across 16 markets. The combined picture supports continued consumer scale, but not uniform growth across every period or territory.

Employment evidence was materially weaker. The ASGC event tracker recorded 10,140 confirmed layoffs through 11 August and forecast 14,666 for the full year. DevQuest showed 6,171 open roles across 315 tracked studios on 22 September, but only 366—5.9%—were entry level. Engineering represented 30.4% of tracked vacancies, 26.5% of listings had remained open for at least 90 days, and 49% of vacancies sat at the top 20 tracked companies. This is not a global census, but within the tracked population it describes concentrated demand with limited junior access.

Capital activity also moved differently from employment. InvestGame and Aream & Co. tracked $3.1 billion of private investment across 108 deals in the second quarter and $2.3 billion across 54 mergers and acquisitions. Those values show that capital continued to enter games businesses; they do not demonstrate that traditional development employment recovered, and the evidence does not establish that deal activity caused either hiring or layoffs.

Publisher results varied too much to support a sector-wide corporate-performance label. Tencent reported domestic games revenue up 17% in the second quarter while international revenue fell 0.8% as reported but rose 4% at constant currency. Capcom reported quarterly net sales up 54.7%, Electronic Arts reported fiscal-year net bookings up 9%, Ubisoft reported first-quarter net bookings down 9.2%, and Microsoft reported Xbox content and services revenue down 10% in its fiscal fourth quarter. Different currencies, periods and segment definitions prevent a ranking, but the dispersion itself is informative: commercial performance was not shared evenly.

Taken together, the evidence supports a market with substantial consumer scale and pockets of strong company performance, alongside persistent workforce contraction and a narrow entry point for new professionals. Strong demand or publisher results cannot be assumed to protect every studio or job. Likewise, layoffs near a release do not establish that the release caused them.

## Major structural stories

| Story | Strongest evidence | What remains uncertain |
|---|---|---|
| Consumer scale and employment diverged | Global demand forecasts; 10,140 tracked layoffs; 5.9% entry-level vacancy share | Forecasts and workforce trackers cover different populations and cannot form one composite score |
| Junior access was constrained | 366 entry-level roles among 6,171 DevQuest openings | The tracker is not a global vacancy census and does not measure completed hires |
| Publisher outcomes differed sharply | Tencent domestic +17%; Capcom sales +54.7%; EA bookings +9%; Ubisoft bookings -9.2%; Xbox content and services -10% | Reporting periods, currencies and segments are incompatible |
| Capital returned without proving employment recovery | $3.1B private investment and $2.3B M&A in Q2; continued tracked layoffs | No causal link between transactions and employment is established |

## Commercially significant 2026 releases with defensible evidence

The active registries produced two individual releases with stored, source-level commercial observations. Publishing a 20-title ranking would require inventing comparability or relying on unpreserved evidence, so this baseline records only the supported cases.

| Game | Publisher | Commercial evidence | Measurement | Limitation |
|---|---|---|---|---|
| Assassin's Creed Black Flag Resynced | Ubisoft | 3.5 million sold-in copies in the first 14 days | Publisher-reported | Sold-in is not necessarily consumer sell-through |
| Onimusha: Way of the Sword | Capcom | More than one million units reported on launch day | Publisher-reported | Stored evidence does not break down platform or territory |

These examples show that major releases could achieve substantial volume while publisher-level and workforce conditions remained mixed. They are evidence points, not a ranking of all 2026 games.

## Anticipated games

No 20-title anticipated-games list is published. The active registry contains possible sources for wishlists, store position, engagement and publisher disclosures, but the retained evidence does not preserve a compatible series across titles. Mixing wishlists, social attention, search activity and editorial anticipation into one ranking would create false precision. This remains a documented evidence gap rather than an invitation to guess.

## Missing evidence

No verified game-specific graduate total, identified-games-workforce inflow, identified-games-workforce outflow or matching trailing-12-month graduate-to-entry-opportunity ratio was established. Private-company employment and studio closures remain incompletely observed, particularly outside English-language North American and European reporting. Layoff data comes from event trackers rather than an official global register, so the confirmed total should be read as a tracked minimum, not a complete census.

## Relationship to the September snapshot

The September snapshot was directionally consistent with this baseline on market scale, layoffs and constrained junior hiring, but its short window gave those newly published observations disproportionate prominence. The year-to-date view adds an important qualification: publisher performance and investment were highly uneven rather than uniformly weak, and consumer scale did not translate reliably into broad workforce improvement. The September report remains unchanged as the record of that collection window.
