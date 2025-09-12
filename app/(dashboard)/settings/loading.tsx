export default function SettingsLoading() {
  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
        
        <div className="space-y-6">
          <div>
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-10 bg-gray-100 rounded"></div>
          </div>
          
          <div>
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-10 bg-gray-100 rounded"></div>
          </div>
          
          <div>
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-10 bg-gray-100 rounded"></div>
          </div>
          
          <div className="flex gap-3">
            <div className="flex-1 h-10 bg-gray-200 rounded"></div>
            <div className="w-20 h-10 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  )
}