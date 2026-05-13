import Header from '../Header'
import Sidebar from '../Sidebar'
import ContentArea from '../ContentArea'
import DetailPanel from '../DetailPanel'
import { ToastProvider } from '../Toast'
import useAppStore from '../../store/useAppStore'
import BookmarkDndProvider from '../dnd/BookmarkDndProvider'

export default function MainLayout() {
  const detailPanelOpen = useAppStore((s) => s.detailPanelOpen)

  return (
    <ToastProvider>
      <BookmarkDndProvider>
        <div className="flex flex-col h-screen overflow-hidden bg-gray-50">
          <Header />
          <div className="flex flex-1 overflow-hidden pt-14">
            <Sidebar />
            <div className={`flex flex-1 min-w-0 overflow-y-auto transition-all ${detailPanelOpen ? 'lg:mr-80' : ''}`}>
              <ContentArea />
            </div>
            <DetailPanel />
          </div>
        </div>
      </BookmarkDndProvider>
    </ToastProvider>
  )
}
