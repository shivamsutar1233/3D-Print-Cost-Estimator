// import { useEffect, useRef } from "react";
// import * as THREE from "three";
// import { STLLoader } from "three/examples/jsm/loaders/STLLoader";

// export default function Preview3D({ previewUrl }) {
//   const mountRef = useRef(null);

//   useEffect(() => {
//     if (!previewUrl || !mountRef.current) return;

//     const width = mountRef.current.clientWidth || 400;
//     const height = 360;
//     const scene = new THREE.Scene();
//     scene.background = new THREE.Color(0x0f1115);
//     const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
//     const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
//     renderer.setSize(width, height);
//     mountRef.current.innerHTML = "";
//     mountRef.current.appendChild(renderer.domElement);

//     const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
//     scene.add(hemi);
//     const dir = new THREE.DirectionalLight(0xffffff, 0.8);
//     dir.position.set(10, 10, 10);
//     scene.add(dir);

//     const loader = new STLLoader();
//     let mesh = null;
//     loader.load(
//       previewUrl,
//       (geometry) => {
//         const material = new THREE.MeshStandardMaterial({
//           color: 0x6d28d9,
//           metalness: 0.2,
//           roughness: 0.5,
//         });
//         geometry.computeBoundingBox();
//         const center = geometry.boundingBox.getCenter(new THREE.Vector3());
//         mesh = new THREE.Mesh(geometry, material);
//         mesh.position.sub(center);
//         scene.add(mesh);
//         camera.position.set(
//           0,
//           0,
//           Math.max(
//             geometry.boundingBox.getSize(new THREE.Vector3()).length() * 1.5,
//             100
//           )
//         );
//         const animate = () => {
//           requestAnimationFrame(animate);
//           if (mesh) mesh.rotation.y += 0.006;
//           renderer.render(scene, camera);
//         };
//         animate();
//       },
//       undefined,
//       (err) => console.error("STL load error", err)
//     );

//     return () => {
//       if (mountRef.current) mountRef.current.innerHTML = "";
//       renderer.dispose();
//     };
//   }, [previewUrl]);

//   return (
//     <div>
//       <h3 className="text-lg mb-3 font-semibold">3D View</h3>
//       <div
//         ref={mountRef}
//         className="w-full rounded-lg overflow-hidden border border-gray-700"
//         style={{ height: 360 }}
//       />
//     </div>
//   );
// }
import { Canvas, useLoader } from "@react-three/fiber";
import { OrbitControls, Html, Environment } from "@react-three/drei";
import { Suspense, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader";

function Model({ fileUrl }) {
  const mesh = useRef();
  const geometry = useLoader(STLLoader, fileUrl);

  // Auto center and scale the model
  useEffect(() => {
    geometry.computeBoundingBox();
    const box = geometry.boundingBox;
    const center = new THREE.Vector3();
    box.getCenter(center);
    geometry.translate(-center.x, -center.y, -center.z);

    const size = new THREE.Vector3();
    box.getSize(size);
    const maxAxis = Math.max(size.x, size.y, size.z);
    const scale = 2 / maxAxis;
    mesh.current.scale.set(scale, scale, scale);
  }, [geometry]);

  return (
    <mesh ref={mesh} geometry={geometry}>
      <meshStandardMaterial
        color="#6366F1"
        metalness={0.3}
        roughness={0.4}
        envMapIntensity={0.8}
      />
    </mesh>
  );
}

export default function Preview3D({ previewUrl }) {
  const [fileUrl, setFileUrl] = useState(null);

  useEffect(() => {
    setFileUrl(previewUrl);
  }, [previewUrl]);

  return (
    <div className="relative h-[500px] bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl overflow-hidden shadow-lg border border-gray-700">
      {!fileUrl ? (
        <div className="flex flex-col items-center justify-center h-full text-gray-400">
          <p className="text-lg font-medium">Upload a 3D model to preview</p>
        </div>
      ) : (
        <Canvas
          shadows
          camera={{ position: [3, 3, 3], fov: 45 }}
          gl={{ preserveDrawingBuffer: true }}
        >
          <color attach="background" args={["#0f172a"]} />
          <Suspense
            fallback={
              <Html center>
                <p className="text-gray-400 text-sm">Loading model...</p>
              </Html>
            }
          >
            <ambientLight intensity={0.6} />
            <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
            <Environment preset="warehouse" />
            <Model fileUrl={fileUrl} />
          </Suspense>
          <OrbitControls
            enablePan
            enableZoom
            enableRotate
            dampingFactor={0.05}
          />
          <gridHelper args={[10, 10, "#1e293b", "#334155"]} />
          <axesHelper args={[2]} />
        </Canvas>
      )}
    </div>
  );
}
