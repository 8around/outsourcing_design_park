'use client';

import React from 'react';

interface TabProps {
  label: string;
  children: React.ReactNode;
  value: string;
}

export function Tab({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

interface TabsProps {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactElement<TabProps>[];
  className?: string;
}

export function Tabs({ value, onChange, children, className = '' }: TabsProps) {
  return (
    <div className={className}>
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {React.Children.map(children, (child) => {
            if (!React.isValidElement(child)) return null;
            
            const isActive = child.props.value === value;
            
            return (
              <button
                onClick={() => onChange(child.props.value)}
                className={`
                  py-2 px-1 border-b-2 font-medium text-sm
                  ${isActive
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                {child.props.label}
              </button>
            );
          })}
        </nav>
      </div>
      
      <div className="mt-4">
        {React.Children.map(children, (child) => {
          if (!React.isValidElement(child)) return null;
          if (child.props.value !== value) return null;
          return child.props.children;
        })}
      </div>
    </div>
  );
}