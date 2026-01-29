import { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="container" style={{ marginTop: '2rem' }}>
          <div className="card">
            <h2 style={{ color: '#dc2626', marginBottom: '1rem' }}>Something went wrong</h2>
            <p style={{ marginBottom: '1rem' }}>
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button onClick={() => window.location.reload()}>
              Reload Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
