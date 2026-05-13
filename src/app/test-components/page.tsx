'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Modal } from '@/components/ui/Modal';

export default function TestComponentsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-gray-900">UI Components Test Page</h1>

        {/* Button Component */}
        <Card>
          <h2 className="text-xl font-semibold mb-4">Button Component</h2>
          <div className="flex flex-wrap gap-4">
            <Button variant="primary" size="sm">Primary SM</Button>
            <Button variant="primary" size="md">Primary MD</Button>
            <Button variant="primary" size="lg">Primary LG</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="ghost">Ghost</Button>
            <Button loading>Loading</Button>
            <Button disabled>Disabled</Button>
          </div>
        </Card>

        {/* Input Component */}
        <Card>
          <h2 className="text-xl font-semibold mb-4">Input Component</h2>
          <div className="space-y-4">
            <Input
              label="Text Input"
              placeholder="Enter text..."
              value={inputValue}
              onChange={setInputValue}
            />
            <Input
              label="Required Input"
              placeholder="This field is required..."
              value=""
              onChange={() => {}}
              required
            />
            <Input
              label="Password Input"
              type="password"
              placeholder="Enter password..."
              value={password}
              onChange={setPassword}
            />
            <Input
              label="Error State"
              error="This field has an error"
              placeholder="Error input..."
              value=""
              onChange={() => {}}
            />
            <Input
              label="Disabled Input"
              disabled
              placeholder="Disabled input..."
              value=""
              onChange={() => {}}
            />
          </div>
        </Card>

        {/* Card Component */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <h3 className="font-semibold mb-2">Regular Card</h3>
            <p className="text-gray-600">This is a regular card component</p>
          </Card>
          <Card hoverable>
            <h3 className="font-semibold mb-2">Hoverable Card</h3>
            <p className="text-gray-600">This card has hover effects</p>
          </Card>
        </div>

        {/* Badge Component */}
        <Card>
          <h2 className="text-xl font-semibold mb-4">Badge Component</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">Medium size (default)</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="success" size="md">Success</Badge>
                <Badge variant="warning" size="md">Warning</Badge>
                <Badge variant="danger" size="md">Danger</Badge>
                <Badge variant="info" size="md">Info</Badge>
                <Badge variant="neutral" size="md">Neutral</Badge>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">Small size</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="success" size="sm">Success</Badge>
                <Badge variant="warning" size="sm">Warning</Badge>
                <Badge variant="danger" size="sm">Danger</Badge>
                <Badge variant="info" size="sm">Info</Badge>
                <Badge variant="neutral" size="sm">Neutral</Badge>
              </div>
            </div>
          </div>
        </Card>

        {/* ProgressBar Component */}
        <Card>
          <h2 className="text-xl font-semibold mb-4">ProgressBar Component</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">Small (25%)</p>
              <ProgressBar value={25} height={4} />
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">Medium (50%)</p>
              <ProgressBar value={50} height={8} />
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">Large (75%)</p>
              <ProgressBar value={75} height={12} color="bg-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">Indeterminate</p>
              <ProgressBar value={0} variant="indeterminate" />
            </div>
          </div>
        </Card>

        {/* Modal Component */}
        <Card>
          <h2 className="text-xl font-semibold mb-4">Modal Component</h2>
          <Button onClick={() => setIsModalOpen(true)}>Open Modal</Button>
        </Card>

        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Test Modal"
          size="md"
        >
          <div className="space-y-4">
            <p>This is a modal dialog. Press ESC or click outside to close.</p>
            <Input label="Modal Input" placeholder="Type something..." value="" onChange={() => {}} />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={() => setIsModalOpen(false)}>
                Confirm
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}
