'use client';

import { XMarkIcon } from '@heroicons/react/24/outline';
import { ExclamationTriangleIcon, CheckCircleIcon, InformationCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';

interface AlertProps {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  onClose?: () => void;
  className?: string;
}

export function Alert({ type, message, onClose, className = '' }: AlertProps) {
  const styles = {
    success: {
      container: 'bg-green-50 border-green-400',
      icon: CheckCircleIcon,
      iconColor: 'text-green-400',
      textColor: 'text-green-800'
    },
    error: {
      container: 'bg-red-50 border-red-400',
      icon: XCircleIcon,
      iconColor: 'text-red-400',
      textColor: 'text-red-800'
    },
    warning: {
      container: 'bg-yellow-50 border-yellow-400',
      icon: ExclamationTriangleIcon,
      iconColor: 'text-yellow-400',
      textColor: 'text-yellow-800'
    },
    info: {
      container: 'bg-blue-50 border-blue-400',
      icon: InformationCircleIcon,
      iconColor: 'text-blue-400',
      textColor: 'text-blue-800'
    }
  };

  const style = styles[type];
  const Icon = style.icon;

  return (
    <div className={`rounded-md border p-4 ${style.container} ${className}`}>
      <div className="flex">
        <div className="flex-shrink-0">
          <Icon className={`h-5 w-5 ${style.iconColor}`} aria-hidden="true" />
        </div>
        <div className="ml-3 flex-1">
          <p className={`text-sm font-medium ${style.textColor}`}>
            {message}
          </p>
        </div>
        {onClose && (
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                type="button"
                onClick={onClose}
                className={`inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 ${style.textColor} hover:bg-opacity-25`}
              >
                <span className="sr-only">닫기</span>
                <XMarkIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}