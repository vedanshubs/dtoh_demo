import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // Surface in dev tools so we can diagnose later
    console.error('[ChartErrorBoundary]', this.props.label || 'panel', error, info?.componentStack)
  }

  reset = () => this.setState({ error: null })

  render() {
    if (this.state.error) {
      return (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8,
          padding: '10px 14px', fontSize: 12, color: '#b91c1c',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 2 }}>
              Couldn't render {this.props.label || 'this chart'}
            </div>
            <div style={{ color: '#991b1b', fontSize: 11, fontFamily: 'monospace' }}>
              {String(this.state.error?.message || this.state.error).slice(0, 200)}
            </div>
          </div>
          <button onClick={this.reset} style={{
            background: '#fff', border: '1px solid #fecaca', borderRadius: 6,
            padding: '4px 10px', fontSize: 11, color: '#b91c1c',
            cursor: 'pointer', fontWeight: 600,
          }}>Retry</button>
        </div>
      )
    }
    return this.props.children
  }
}
