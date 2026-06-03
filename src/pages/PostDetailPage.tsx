import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { usePostById } from '@/lib/posts'
import { PostDetailContent } from '@/components/PostDetailModal'
import { Page } from '@/components/Page'

/** Deep-linkable single-post view (/p/:id) — reuses the lightbox content inline. */
export function PostDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: post, isLoading } = usePostById(id)

  function goBack() {
    if (window.history.length > 1) navigate(-1)
    else navigate('/')
  }

  return (
    <Page className="mx-auto max-w-[1040px] pt-2 lg:pt-6">
      <button
        type="button"
        onClick={goBack}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-white/70 transition hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {isLoading ? (
        <div className="grid place-items-center py-32" aria-label="Loading" role="status">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-white/70" />
        </div>
      ) : post ? (
        <div className="glass edge-light flex max-h-[80dvh] w-full flex-col overflow-hidden rounded-4xl md:flex-row">
          <PostDetailContent post={post} onAfterDelete={() => navigate('/')} />
        </div>
      ) : (
        <div className="glass edge-light grid place-items-center gap-4 rounded-4xl py-20 text-center">
          <p className="text-sm text-white/70">This post isn’t available — it may have been deleted.</p>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="bg-aurora rounded-xl px-5 py-2 text-sm font-semibold text-white shadow-[var(--shadow-glow-violet)]"
          >
            Back to feed
          </button>
        </div>
      )}
    </Page>
  )
}
