import { useEffect, useMemo, useState } from 'react';
import { Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getAllTranslations, Translations } from '../../lib/i18n';

type AuditStatus = 'ok' | 'warn' | 'fail';

interface AuditScenario {
  id: string;
  label: string;
  width: number;
  horizontalPadding: number;
  iconAllowance?: number;
  font: string;
  lineHeight: number;
  maxLines: number;
  text: (t: Translations) => string;
}

interface AuditFinding {
  locale: string;
  scenarioId: string;
  scenarioLabel: string;
  text: string;
  width: number;
  lineCount: number;
  height: number;
  status: AuditStatus;
}

const SCENARIOS: AuditScenario[] = [
  {
    id: 'auth-login',
    label: 'Login primary button',
    width: 320,
    horizontalPadding: 32,
    font: '700 16px Arial',
    lineHeight: 22,
    maxLines: 2,
    text: (t) => t.auth.login,
  },
  {
    id: 'auth-create-account',
    label: 'Register helper CTA',
    width: 320,
    horizontalPadding: 32,
    font: '700 16px Arial',
    lineHeight: 22,
    maxLines: 2,
    text: (t) => t.auth.create_account,
  },
  {
    id: 'auth-google',
    label: 'Google continue button',
    width: 320,
    horizontalPadding: 32,
    iconAllowance: 44,
    font: '500 16px Arial',
    lineHeight: 22,
    maxLines: 2,
    text: (t) => t.auth.continue_with_google,
  },
  {
    id: 'auth-reset-link',
    label: 'Send reset link button',
    width: 320,
    horizontalPadding: 32,
    font: '700 16px Arial',
    lineHeight: 22,
    maxLines: 2,
    text: (t) => t.auth.send_reset_link,
  },
  {
    id: 'auth-reset-submit',
    label: 'Save new password button',
    width: 320,
    horizontalPadding: 32,
    font: '700 16px Arial',
    lineHeight: 22,
    maxLines: 2,
    text: (t) => t.auth.reset_password_submit,
  },
  {
    id: 'documents-upload',
    label: 'Documents header upload button',
    width: 150,
    horizontalPadding: 32,
    font: '700 14px Arial',
    lineHeight: 18,
    maxLines: 2,
    text: (t) => t.documents.upload,
  },
  {
    id: 'documents-send-question',
    label: 'Document chat send button',
    width: 116,
    horizontalPadding: 32,
    font: '700 12px Arial',
    lineHeight: 16,
    maxLines: 2,
    text: (t) => t.documents.send_question,
  },
  {
    id: 'plaza-publish-fab',
    label: 'Plaza floating publish button',
    width: 138,
    horizontalPadding: 56,
    iconAllowance: 26,
    font: '600 16px Arial',
    lineHeight: 22,
    maxLines: 2,
    text: (t) => t.plaza.publish_note,
  },
  {
    id: 'plaza-add-to-odyssey',
    label: 'Plaza add-to-odyssey button',
    width: 154,
    horizontalPadding: 32,
    font: '600 14px Arial',
    lineHeight: 20,
    maxLines: 2,
    text: (t) => t.plaza.add_to_tasks,
  },
  {
    id: 'plaza-refresh-verification',
    label: 'Plaza refresh verification button',
    width: 184,
    horizontalPadding: 32,
    font: '600 14px Arial',
    lineHeight: 20,
    maxLines: 2,
    text: (t) => t.plaza.refresh_verification,
  },
];

function statusTone(status: AuditStatus) {
  if (status === 'fail') {
    return { bg: '#FFE6EA', text: '#C81E3A' };
  }
  if (status === 'warn') {
    return { bg: '#FFF2DD', text: '#C97300' };
  }
  return { bg: '#EAF7DF', text: '#3F8F0B' };
}

function summarizeByLocale(findings: AuditFinding[]) {
  const bucket = new Map<string, { fail: number; warn: number }>();
  for (const finding of findings) {
    const current = bucket.get(finding.locale) ?? { fail: 0, warn: 0 };
    if (finding.status === 'fail') current.fail += 1;
    if (finding.status === 'warn') current.warn += 1;
    bucket.set(finding.locale, current);
  }
  return [...bucket.entries()]
    .filter(([, value]) => value.fail > 0 || value.warn > 0)
    .sort((a, b) => (b[1].fail * 10 + b[1].warn) - (a[1].fail * 10 + a[1].warn));
}

export default function ButtonAuditScreen() {
  const [findings, setFindings] = useState<AuditFinding[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const { prepare, layout } = await import('@chenglou/pretext');
        const catalog = getAllTranslations();
        const nextFindings: AuditFinding[] = [];

        for (const [locale, translations] of Object.entries(catalog)) {
          for (const scenario of SCENARIOS) {
            const text = scenario.text(translations).trim();
            const widthBudget = Math.max(
              scenario.width - scenario.horizontalPadding - (scenario.iconAllowance ?? 0),
              60,
            );
            const prepared = prepare(text, scenario.font);
            const metrics = layout(prepared, widthBudget, scenario.lineHeight);
            const status: AuditStatus =
              metrics.lineCount > scenario.maxLines
                ? 'fail'
                : metrics.lineCount === scenario.maxLines
                  ? 'warn'
                  : 'ok';

            if (status !== 'ok') {
              nextFindings.push({
                locale,
                scenarioId: scenario.id,
                scenarioLabel: scenario.label,
                text,
                width: widthBudget,
                lineCount: metrics.lineCount,
                height: metrics.height,
                status,
              });
            }
          }
        }

        if (!cancelled) {
          setFindings(nextFindings);
        }
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : 'Audit failed');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const localeSummary = useMemo(() => summarizeByLocale(findings), [findings]);
  const failCount = findings.filter((item) => item.status === 'fail').length;
  const warnCount = findings.filter((item) => item.status === 'warn').length;

  if (Platform.OS !== 'web') {
    return (
      <SafeAreaView className="flex-1 bg-surface px-6 py-10">
        <Text className="text-2xl font-extrabold text-primary">Button Audit</Text>
        <Text className="mt-4 text-base leading-7 text-gray-600">
          This audit route uses browser text measurement and only runs on Expo Web.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <ScrollView contentContainerClassName="px-5 py-8 gap-5">
        <View className="rounded-[28px] bg-white p-5">
          <Text className="text-[28px] font-extrabold text-primary">Button Overflow Audit</Text>
          <Text className="mt-2 text-sm leading-6 text-gray-500">
            Pretext-based web audit for translated button labels. It flags scenarios that already use two lines
            and fails anything that would spill past the allowed line budget.
          </Text>
        </View>

        {error ? (
          <View className="rounded-[24px] bg-[#FFE6EA] p-4">
            <Text className="text-sm font-bold text-[#C81E3A]">{error}</Text>
          </View>
        ) : null}

        <View className="flex-row flex-wrap gap-3">
          <View className="rounded-[22px] bg-white px-4 py-4">
            <Text className="text-xs font-extrabold uppercase tracking-wide text-gray-400">Scenarios</Text>
            <Text className="mt-1 text-2xl font-extrabold text-gray-900">{SCENARIOS.length}</Text>
          </View>
          <View className="rounded-[22px] bg-white px-4 py-4">
            <Text className="text-xs font-extrabold uppercase tracking-wide text-gray-400">Fail</Text>
            <Text className="mt-1 text-2xl font-extrabold text-[#C81E3A]">{failCount}</Text>
          </View>
          <View className="rounded-[22px] bg-white px-4 py-4">
            <Text className="text-xs font-extrabold uppercase tracking-wide text-gray-400">Warn</Text>
            <Text className="mt-1 text-2xl font-extrabold text-[#C97300]">{warnCount}</Text>
          </View>
          <View className="rounded-[22px] bg-white px-4 py-4">
            <Text className="text-xs font-extrabold uppercase tracking-wide text-gray-400">Locales flagged</Text>
            <Text className="mt-1 text-2xl font-extrabold text-gray-900">{localeSummary.length}</Text>
          </View>
        </View>

        <View className="rounded-[28px] bg-white p-5">
          <Text className="text-lg font-extrabold text-gray-900">Top locales at risk</Text>
          <View className="mt-4 gap-3">
            {localeSummary.length ? localeSummary.slice(0, 16).map(([locale, stats]) => (
              <View key={locale} className="flex-row items-center justify-between rounded-[18px] bg-surface px-4 py-3">
                <Text className="text-sm font-bold text-gray-900">{locale}</Text>
                <Text className="text-sm text-gray-500">
                  {stats.fail} fail · {stats.warn} warn
                </Text>
              </View>
            )) : (
              <Text className="text-sm text-success">No risky locales detected for the audited button set.</Text>
            )}
          </View>
        </View>

        <View className="rounded-[28px] bg-white p-5">
          <Text className="text-lg font-extrabold text-gray-900">Findings</Text>
          <View className="mt-4 gap-3">
            {findings.length ? findings.map((finding, index) => {
              const tone = statusTone(finding.status);
              return (
                <View key={`${finding.locale}-${finding.scenarioId}-${index}`} className="rounded-[22px] border border-[#EEF1F6] p-4">
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1">
                      <Text className="text-sm font-extrabold text-gray-900">{finding.scenarioLabel}</Text>
                      <Text className="mt-1 text-xs text-gray-400">{finding.locale}</Text>
                    </View>
                    <View style={{ backgroundColor: tone.bg }} className="rounded-full px-3 py-1.5">
                      <Text style={{ color: tone.text }} className="text-[11px] font-extrabold uppercase tracking-wide">
                        {finding.status}
                      </Text>
                    </View>
                  </View>
                  <Text className="mt-3 rounded-[18px] bg-surface px-3 py-3 text-sm leading-6 text-gray-700">
                    {finding.text}
                  </Text>
                  <Text className="mt-3 text-xs text-gray-500">
                    width budget {finding.width}px · line count {finding.lineCount} · height {finding.height}px
                  </Text>
                </View>
              );
            }) : (
              <Text className="text-sm text-success">Everything in the audited set fits within the current budgets.</Text>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
