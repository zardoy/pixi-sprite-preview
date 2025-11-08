import { useState } from "react";
import { LandingPage } from "@/components/LandingPage";
import { AnimationViewer } from "@/components/AnimationViewer";

const Index = () => {
  const [selectedFiles, setSelectedFiles] = useState<File[] | null>(null);

  const handleFolderSelect = (files: File[]) => {
    setSelectedFiles(files);
  };

  const handleBack = () => {
    setSelectedFiles(null);
  };

  return (
    <>
      {!selectedFiles ? (
        <LandingPage onFolderSelect={handleFolderSelect} />
      ) : (
        <AnimationViewer files={selectedFiles} onBack={handleBack} />
      )}
    </>
  );
};

export default Index;
