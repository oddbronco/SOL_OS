import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Project } from '../../types';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (project: Omit<Project, 'id' | 'created_at' | 'updated_at'>) => void;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  onSubmit
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    problem_summary: '',
    scope: '',
    priority: 'medium' as Project['priority'],
    timeline: {
      start_date: '',
      expected_end_date: ''
    },
    budget: {
      estimated: 0,
      currency: 'USD'
    }
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const project: Omit<Project, 'id' | 'created_at' | 'updated_at'> = {
        agency_id: 'agency-1',
        client_company_id: 'client-1',
        name: formData.name,
        description: formData.description,
        problem_summary: formData.problem_summary,
        objectives: [],
        scope: formData.scope,
        timeline: {
          start_date: formData.timeline.start_date,
          expected_end_date: formData.timeline.expected_end_date
        },
        budget: formData.budget,
        status: 'draft',
        priority: formData.priority,
        tags: [],
        team: {
          project_manager: 'user-1',
          analysts: [],
          stakeholders: []
        },
        settings: {
          response_types: ['text', 'audio', 'video'],
          require_all_questions: false,
          auto_reminders: true,
          reminder_interval_days: 3
        },
        metrics: {
          total_stakeholders: 0,
          completed_responses: 0,
          avg_response_time_minutes: 0
        },
        created_by: 'user-1'
      };

      await onSubmit(project);
      onClose();
    } catch (error) {
      console.error('Failed to create project:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Project" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Project Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <Select
            label="Priority"
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: e.target.value as Project['priority'] })}
            options={[
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' },
              { value: 'urgent', label: 'Urgent' }
            ]}
          />
        </div>

        <Input
          label="Description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          required
        />

        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700">Problem Summary</label>
          <textarea
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={3}
            value={formData.problem_summary}
            onChange={(e) => setFormData({ ...formData, problem_summary: e.target.value })}
            required
          />
        </div>

        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700">Scope</label>
          <textarea
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={3}
            value={formData.scope}
            onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Start Date"
            type="date"
            value={formData.timeline.start_date}
            onChange={(e) => setFormData({
              ...formData,
              timeline: { ...formData.timeline, start_date: e.target.value }
            })}
            required
          />
          <Input
            label="Expected End Date"
            type="date"
            value={formData.timeline.expected_end_date}
            onChange={(e) => setFormData({
              ...formData,
              timeline: { ...formData.timeline, expected_end_date: e.target.value }
            })}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Estimated Budget"
            type="number"
            value={formData.budget.estimated}
            onChange={(e) => setFormData({
              ...formData,
              budget: { ...formData.budget, estimated: Number(e.target.value) }
            })}
          />
          <Select
            label="Currency"
            value={formData.budget.currency}
            onChange={(e) => setFormData({
              ...formData,
              budget: { ...formData.budget, currency: e.target.value }
            })}
            options={[
              { value: 'USD', label: 'USD' },
              { value: 'EUR', label: 'EUR' },
              { value: 'GBP', label: 'GBP' }
            ]}
          />
        </div>

        <div className="flex justify-end space-x-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Create Project
          </Button>
        </div>
      </form>
    </Modal>
  );
};