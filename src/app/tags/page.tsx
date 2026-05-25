'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';

interface Tag {
  name: string;
  count: number;
}

export default function TagsPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [deleteTag, setDeleteTag] = useState<Tag | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Fetch tags
  useEffect(() => {
    if (!user) return;

    const fetchTags = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const response = await fetch('/api/tags', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          // Sort by count descending
          const sortedTags = (data.tags || []).sort(
            (a: Tag, b: Tag) => b.count - a.count
          );
          setTags(sortedTags);
        } else if (response.status === 401) {
          router.push('/login');
        }
      } catch (err) {
        console.error('Failed to fetch tags:', err);
        setError('Failed to load tags');
      } finally {
        setLoading(false);
      }
    };

    fetchTags();
  }, [user, router]);

  // Validate tag name
  const validateTag = (tag: string): string | null => {
    const trimmed = tag.trim();
    if (!trimmed) return 'Tag name cannot be empty';
    if (trimmed.length > 30)
      return 'Tag name must be 30 characters or less';
    if (!/^[a-zA-Z0-9\s\-_]+$/.test(trimmed)) {
      return 'Tag can only contain letters, numbers, spaces, hyphens, and underscores';
    }
    return null;
  };

  // Handle rename
  const handleRename = async (oldName: string) => {
    const validationError = validateTag(newName);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (newName.trim() === oldName.trim()) {
      setError('New name must be different from current name');
      return;
    }

    setIsSaving(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/tags/rename', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          oldName: oldName.trim(),
          newName: newName.trim(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Refresh tags list
        const tagsResponse = await fetch('/api/tags', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (tagsResponse.ok) {
          const tagsData = await tagsResponse.json();
          const sortedTags = (tagsData.tags || []).sort(
            (a: Tag, b: Tag) => b.count - a.count
          );
          setTags(sortedTags);
        }
        setEditingTag(null);
        setNewName('');
        setError(null);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to rename tag');
      }
    } catch (err) {
      console.error('Error renaming tag:', err);
      setError('Failed to rename tag');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle delete
  const handleDelete = async (tagName: string) => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem('authToken');
      const encodedName = encodeURIComponent(tagName);
      const response = await fetch(`/api/tags/${encodedName}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        // Refresh tags list
        const tagsResponse = await fetch('/api/tags', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (tagsResponse.ok) {
          const tagsData = await tagsResponse.json();
          const sortedTags = (tagsData.tags || []).sort(
            (a: Tag, b: Tag) => b.count - a.count
          );
          setTags(sortedTags);
        }
        setDeleteTag(null);
        setError(null);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to delete tag');
      }
    } catch (err) {
      console.error('Error deleting tag:', err);
      setError('Failed to delete tag');
    } finally {
      setIsSaving(false);
    }
  };

  // Get tag color
  const getTagColor = (tagName: string): string => {
    let hash = 0;
    for (let i = 0; i < tagName.length; i++) {
      hash = tagName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 70%, 85%)`;
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manage Tags</h1>
          <p className="mt-2 text-gray-600">
            Rename or delete tags across all your presentations
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && tags.length === 0 ? (
          <Card className="p-12">
            <div className="text-center">
              <div className="mb-4 text-5xl">🏷️</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                You haven't used any tags yet
              </h2>
              <p className="text-gray-600 mb-6">
                Tags help organize your presentations. Create a presentation and
                add tags to get started.
              </p>
              <Button onClick={() => router.push('/practice')}>
                Create Presentation
              </Button>
            </div>
          </Card>
        ) : (
          /* Tags table */
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Tag
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Usage
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {tags.map((tag) => (
                    <tr key={tag.name} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        {editingTag === tag.name ? (
                          <div className="flex items-center gap-2 flex-1">
                            <input
                              type="text"
                              value={newName}
                              onChange={(e) => {
                                setNewName(e.target.value);
                                setError(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleRename(tag.name);
                                } else if (e.key === 'Escape') {
                                  setEditingTag(null);
                                  setNewName('');
                                  setError(null);
                                }
                              }}
                              placeholder="Enter new tag name"
                              className="px-3 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                              autoFocus
                            />
                          </div>
                        ) : (
                          <div
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
                            style={{
                              backgroundColor: getTagColor(tag.name),
                              color: '#1f2937',
                            }}
                          >
                            {tag.name}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {tag.count} presentation{tag.count !== 1 ? 's' : ''}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-3">
                          {editingTag === tag.name ? (
                            <>
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => handleRename(tag.name)}
                                disabled={isSaving}
                                loading={isSaving}
                              >
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                  setEditingTag(null);
                                  setNewName('');
                                  setError(null);
                                }}
                                disabled={isSaving}
                              >
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                  setEditingTag(tag.name);
                                  setNewName(tag.name);
                                }}
                              >
                                Rename
                              </Button>
                              <Button
                                size="sm"
                                variant="danger"
                                onClick={() => setDeleteTag(tag)}
                              >
                                Delete
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Delete confirmation modal */}
      <Modal
        isOpen={!!deleteTag}
        onClose={() => setDeleteTag(null)}
        title="Delete Tag"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Are you sure you want to delete the tag{' '}
            <span className="font-semibold">{deleteTag?.name}</span>?
          </p>
          <p className="text-sm text-gray-600">
            This will remove it from {deleteTag?.count} presentation
            {deleteTag && deleteTag.count !== 1 ? 's' : ''}.
          </p>
          <div className="flex gap-3 justify-end">
            <Button
              variant="secondary"
              onClick={() => setDeleteTag(null)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (deleteTag) {
                  handleDelete(deleteTag.name);
                }
              }}
              disabled={isSaving}
              loading={isSaving}
            >
              Delete Tag
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
