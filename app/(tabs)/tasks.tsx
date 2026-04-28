import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from 'react-native';

import { PageHeader } from '../../components/PageHeader';
import { useLanguage } from '../../context/LanguageContext';
import { PersonalTaskCard } from '../../features/community/PersonalTaskCard';
import { usePersonalTasks } from '../../features/community/useCommunity';
import { TaskCard, TaskNode, TaskState } from '../../features/tasks/TaskCard';
import { useDag } from '../../features/tasks/useTasks';

interface CanonicalSection {
  title: string;
  data: TaskNode[];
  dim?: boolean;
}

export default function TasksScreen() {
  const { t } = useLanguage();
  const dag = useDag();
  const personal = usePersonalTasks();

  if (dag.isLoading && !dag.data && personal.isLoading && !personal.data) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator size="large" color="#5B67CA" />
      </View>
    );
  }

  if (dag.isError && !dag.data && personal.isError && !personal.data) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <Text className="text-danger">{t.common.error}</Text>
      </View>
    );
  }

  const nodes: TaskNode[] = dag.data?.nodes ?? [];
  const states: TaskState[] = dag.data?.states ?? [];
  const personalTasks = personal.data ?? [];
  const stateMap = Object.fromEntries(states.map((state) => [state.task_node_id, state]));

  const byStatus = (status: string) =>
    nodes.filter((node) => stateMap[node.id]?.status === status);

  const canonicalSections: CanonicalSection[] = [
    { title: t.tasks.section_progress, data: byStatus('in_progress') },
    { title: t.tasks.section_available, data: byStatus('available') },
    { title: t.tasks.section_done, data: byStatus('done'), dim: true },
    { title: t.tasks.section_locked, data: byStatus('locked'), dim: true },
  ].filter((section) => section.data.length > 0);

  const doneCount = byStatus('done').length;
  const totalCount = nodes.length;
  const showError = dag.isError || personal.isError;
  const refreshAll = () => {
    void dag.refetch();
    void personal.refetch();
  };

  return (
    <View className="flex-1 bg-surface">
      <PageHeader title={t.tasks.title} />

      {showError ? (
        <Text className="px-5 pb-2 text-xs text-danger">{t.common.error}</Text>
      ) : null}

      {totalCount > 0 ? (
        <View className="px-5 pb-2">
          <View style={{ backgroundColor: '#D7DDF8' }} className="rounded-[30px] p-[2px] pb-[7px]">
            <View className="rounded-[28px] border border-white/80 bg-white px-4 py-4">
              <View className="mb-3 flex-row items-center justify-between gap-3">
                <View className="flex-1">
                  <Text className="text-xs font-extrabold uppercase tracking-[1px] text-primary/70">
                    {t.tasks.section_progress}
                  </Text>
                  <Text className="mt-1 text-2xl font-extrabold text-gray-900">
                    {doneCount}/{totalCount}
                  </Text>
                </View>
                <View className="rounded-full bg-success/10 px-3 py-1.5">
                  <Text className="text-xs font-extrabold text-success">
                    {Math.round((doneCount / totalCount) * 100)}%
                  </Text>
                </View>
              </View>

              <View className="rounded-full bg-[#E7EBF5] p-1">
                <View
                  className="h-4 rounded-full bg-success"
                  style={{ width: `${Math.round((doneCount / totalCount) * 100)}%` }}
                />
              </View>
            </View>
          </View>
        </View>
      ) : null}

      {nodes.length === 0 && personalTasks.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="mb-4 text-5xl">Tasks</Text>
          <Text className="mb-1 text-center font-semibold text-gray-700">{t.tasks.empty_no_template}</Text>
          <Text className="text-center text-sm text-gray-400">{t.tasks.empty_no_template_hint}</Text>
        </View>
      ) : canonicalSections.length === 0 && personalTasks.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Text className="mb-4 text-5xl">Done</Text>
          <Text className="px-8 text-center text-gray-500">{t.tasks.empty_active}</Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-5 pb-10"
          refreshControl={
            <RefreshControl
              refreshing={(dag.isFetching && !dag.isLoading) || (personal.isFetching && !personal.isLoading)}
              onRefresh={refreshAll}
              tintColor="#5B67CA"
            />
          }
        >
          {canonicalSections.map((section) => (
            <View key={section.title}>
              <View className="mt-5 mb-3 flex-row items-center">
                <View className="rounded-full bg-white px-3 py-1.5">
                  <Text className="text-[11px] font-extrabold uppercase tracking-[1px] text-gray-500">
                    {section.title}
                  </Text>
                </View>
              </View>
              {section.data.map((node) => (
                <View key={node.id} className={`mb-3 ${section.dim ? 'opacity-60' : ''}`}>
                  <TaskCard node={node} state={stateMap[node.id]} onRefresh={refreshAll} />
                </View>
              ))}
            </View>
          ))}

          {personalTasks.length > 0 ? (
            <View>
              <View className="mt-5 mb-3 flex-row items-center">
                <View className="rounded-full bg-[#FFF1DE] px-3 py-1.5">
                  <Text className="text-[11px] font-extrabold uppercase tracking-[1px] text-secondary">
                    {t.tasks.section_from_plaza}
                  </Text>
                </View>
              </View>
              {personalTasks.map((task) => (
                <View key={task.id} className="mb-3">
                  <PersonalTaskCard task={task} />
                </View>
              ))}
            </View>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}
