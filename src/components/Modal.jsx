'use client'

/**
 * Reusable Modal/Dialog component with consistent styling and behavior
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is visible
 * @param {Function} props.onClose - Callback when modal should close
 * @param {string} props.title - Modal title
 * @param {React.ReactNode} props.children - Modal content
 * @param {Array<Object>} props.buttons - Array of button objects {label, onClick, variant}
 * @param {boolean} props.closeable - Whether modal can be closed by clicking backdrop
 * @param {string} props.size - Modal size: 'sm', 'md', 'lg', 'xl' (default: 'md')
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  buttons = [],
  closeable = true,
  size = 'md'
}) {
  if (!isOpen) return null

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  }

  const handleBackdropClick = () => {
    if (closeable) onClose()
  }

  const handleContentClick = (e) => {
    e.stopPropagation()
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div
        className={`bg-white rounded-2xl w-full ${sizeClasses[size]} p-6 shadow-xl max-h-[90vh] overflow-y-auto`}
        onClick={handleContentClick}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
            {closeable && (
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 transition-colors"
                aria-label="Close modal"
              >
                <span className="material-symbols-outlined text-3xl">close</span>
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="mb-6">
          {children}
        </div>

        {/* Footer - Buttons */}
        {buttons.length > 0 && (
          <div className="flex gap-3 justify-end mt-6">
            {buttons.map((button, index) => (
              <button
                key={index}
                onClick={button.onClick}
                disabled={button.disabled}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  button.variant === 'secondary'
                    ? 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                    : button.variant === 'danger'
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                } ${button.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {button.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
