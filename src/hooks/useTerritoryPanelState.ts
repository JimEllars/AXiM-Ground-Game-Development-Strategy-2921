import { useState } from 'react';

export const useTerritoryPanelState = () => {
  const [selectedTerritoryId, setSelectedTerritoryId] = useState<string | null>(null);
  const [newTerritory, setNewTerritory] = useState<any>(null);
  const [assignRepId, setAssignRepId] = useState('');

  const handleSelectTerritory = (territoryId: string) => {
    setSelectedTerritoryId(territoryId);
    setNewTerritory(null);
  };

  const handleClearSelection = () => {
    setSelectedTerritoryId(null);
  };

  const handleCreateNewTerritory = (geoJson: any) => {
    setSelectedTerritoryId(null);
    setNewTerritory({
      geoJson,
      name: '',
      description: '',
    });
  };

  const handleCancelNewTerritory = () => {
    setNewTerritory(null);
  };

  return {
    selectedTerritoryId,
    newTerritory,
    assignRepId,
    setSelectedTerritoryId,
    setNewTerritory,
    setAssignRepId,
    handleSelectTerritory,
    handleClearSelection,
    handleCreateNewTerritory,
    handleCancelNewTerritory,
  };
};
