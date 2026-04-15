import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Mainscreen from './components/Mainscreen'
import Viewer from './components/Viewer'

function App() {
  return (
    <Router>
      <Routes>
        <Route path='/' element={<Mainscreen />} />
        <Route path='/viewer/:id' element={<Viewer />} />
      </Routes>
    </Router>
  )
}

export default App
