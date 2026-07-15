import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppFrame from './common/AppFrame';
import HomePage from './homePage/HomePage';
import MapPage from './mapPage/MapPage';
import RecordPage from './recordPage/RecordPage';
import PhotoPage from './photoPage/PhotoPage';
import GalleryPage from './galleryPage/GalleryPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppFrame />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/record" element={<RecordPage />} />
          <Route path="/photo" element={<PhotoPage />} />
          <Route path="/gallery" element={<GalleryPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}