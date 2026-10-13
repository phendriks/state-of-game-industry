import type { CollectionEntry } from 'astro:content';

export function buildDashboardReport(
  latest: CollectionEntry<'reports'>,
  baseline?: CollectionEntry<'reports'>
): CollectionEntry<'reports'> {
  const latestObservationIds = new Set(
    (latest.data.statistical_observations ?? []).map(observation => observation.id)
  );
  const dashboardObservations = [
    ...(latest.data.statistical_observations ?? []),
    ...(baseline?.data.statistical_observations ?? []).filter(
      observation => !latestObservationIds.has(observation.id)
    )
  ];

  // Latest values take precedence; baseline values fill the remaining fields.
  const dashboardTalent = (latest.data.talent_pipeline || baseline?.data.talent_pipeline)
    ? {
        ...(baseline?.data.talent_pipeline ?? {}),
        ...(latest.data.talent_pipeline ?? {}),
        workforce_flow: {
          ...(baseline?.data.talent_pipeline?.workforce_flow ?? {}),
          ...(latest.data.talent_pipeline?.workforce_flow ?? {})
        }
      }
    : undefined;

  return {
    ...latest,
    data: {
      ...latest.data,
      statistical_observations: dashboardObservations,
      talent_pipeline: dashboardTalent
    }
  };
}
