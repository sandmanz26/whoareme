/**
 * Compatibility shim — formerly the hand-rolled router.
 *
 * All routing now goes through react-router-dom. Callers have been updated
 * to use useNavigate() directly; this file is kept only for any remaining
 * references during the transition.
 */
export { useNavigate, useLocation, useParams } from "react-router-dom"
