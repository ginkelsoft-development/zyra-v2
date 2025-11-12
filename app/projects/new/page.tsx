'use client';

import { useRouter } from 'next/navigation';
import ProjectWizard from '@/components/wizard/ProjectWizard';

export default function NewProjectPage() {
  const router = useRouter();

  const handleComplete = (projectPath: string, workflowName?: string) => {
    const projectId = encodeURIComponent(projectPath);

    if (workflowName) {
      const workflowId = encodeURIComponent(workflowName);
      router.push(`/projects/${projectId}/workflows/${workflowId}`);
    } else {
      router.push('/projects');
    }
  };

  const handleCancel = () => {
    router.push('/projects');
  };

  return (
    <ProjectWizard
      onComplete={handleComplete}
      onCancel={handleCancel}
    />
  );
}
