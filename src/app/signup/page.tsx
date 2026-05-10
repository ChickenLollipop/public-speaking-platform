'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/hooks/useAuth';
import { validateEmail, validatePassword, validateName, getPasswordStrength } from '@/lib/utils/validators';

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    skillLevel: 'beginner' as 'beginner' | 'intermediate' | 'advanced',
    goals: [] as string[],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const goalOptions = [
    { id: 'job_interviews', label: 'Job interviews' },
    { id: 'sales_pitches', label: 'Sales pitches' },
    { id: 'academic', label: 'Academic presentations' },
    { id: 'casual_speaking', label: 'Casual speaking' },
  ];

  const handleGoalToggle = (goalId: string) => {
    setFormData(prev => ({
      ...prev,
      goals: prev.goals.includes(goalId)
        ? prev.goals.filter(g => g !== goalId)
        : [...prev.goals, goalId],
    }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    const nameError = validateName(formData.name);
    if (nameError) newErrors.name = nameError;

    const emailError = validateEmail(formData.email);
    if (emailError) newErrors.email = emailError;

    const passwordError = validatePassword(formData.password);
    if (passwordError) newErrors.password = passwordError;

    if (formData.goals.length === 0) {
      newErrors.goals = 'Please select at least one goal';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsLoading(true);

    try {
      await signup(formData);
      router.push('/dashboard');
    } catch (error) {
      console.error('Signup failed:', error);
      const message = error instanceof Error ? error.message : 'Signup failed. Please try again.';
      setErrors({ submit: message });
    } finally {
      setIsLoading(false);
    }
  };

  const passwordStrength = getPasswordStrength(formData.password);

  return (
    <AuthLayout
      title="Create Your Account"
      subtitle="Start improving your public speaking skills"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Name"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Your full name"
          error={errors.name}
          required
        />

        <Input
          label="Email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="you@example.com"
          error={errors.email}
          required
        />

        <div>
          <Input
            label="Password"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder="Min 8 characters"
            error={errors.password}
            required
          />
          {formData.password && (
            <div className="mt-2">
              <div className="flex gap-1">
                <div className={`h-1 flex-1 rounded ${passwordStrength === 'weak' ? 'bg-red-500' : passwordStrength === 'medium' ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
                <div className={`h-1 flex-1 rounded ${passwordStrength === 'medium' || passwordStrength === 'strong' ? 'bg-yellow-500' : 'bg-gray-200'}`}></div>
                <div className={`h-1 flex-1 rounded ${passwordStrength === 'strong' ? 'bg-green-500' : 'bg-gray-200'}`}></div>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Strength: {passwordStrength}
              </p>
            </div>
          )}
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">
            Skill Level <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.skillLevel}
            onChange={(e) => setFormData({ ...formData, skillLevel: e.target.value as 'beginner' | 'intermediate' | 'advanced' })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            Goals <span className="text-red-500">*</span>
          </label>
          <div className="space-y-2">
            {goalOptions.map(goal => (
              <label key={goal.id} className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.goals.includes(goal.id)}
                  onChange={() => handleGoalToggle(goal.id)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-gray-700">{goal.label}</span>
              </label>
            ))}
          </div>
          {errors.goals && (
            <p className="text-sm text-red-500 mt-1">{errors.goals}</p>
          )}
        </div>

        {errors.submit && (
          <p className="text-sm text-red-500 mt-2" role="alert" aria-live="assertive">
            {errors.submit}
          </p>
        )}

        <Button type="submit" className="w-full" isLoading={isLoading}>
          Create Account
        </Button>

        <p className="text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-600 hover:underline">
            Sign In
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
