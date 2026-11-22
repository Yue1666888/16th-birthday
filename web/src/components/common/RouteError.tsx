import { useRouteError, isRouteErrorResponse } from 'react-router'
import { StatusPage } from './StatusPage'
export function RouteError() {
  const error = useRouteError()
  const notFound = isRouteErrorResponse(error) && error.status === 404
  return <StatusPage kind={notFound ? 'not-found' : 'error'} />
}
