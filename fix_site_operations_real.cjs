const fs = require('fs');
let code = fs.readFileSync('src/components/screens/SiteOperationsScreen.tsx', 'utf8');

const paginationLogic = `
  // --- PAGINATION & FILTER LOGIC ---
  const filteredCheckpoints = useMemo(() => {
    return checkpoints.filter(cp => {
      const matchSearch = cp.checkpointName.toLowerCase().includes(searchQuery.toLowerCase()) || cp.code.toLowerCase().includes(searchQuery.toLowerCase());
      return matchSearch;
    }).sort((a, b) => a.sequenceOrder - b.sequenceOrder);
  }, [checkpoints, searchQuery]);

  const paginatedCheckpoints = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredCheckpoints.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredCheckpoints, currentPage, itemsPerPage]);

  const filteredPatrolLogs = useMemo(() => {
    return patrolLogs.filter(p => {
      const matchSearch = p.patrolName.toLowerCase().includes(searchQuery.toLowerCase()) || p.guardName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchSite = selectedSiteId === 'ALL' || p.siteId === selectedSiteId;
      return matchSearch && matchSite;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [patrolLogs, searchQuery, selectedSiteId]);

  const paginatedPatrolLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredPatrolLogs.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredPatrolLogs, currentPage, itemsPerPage]);

  const filteredIncidents = useMemo(() => {
    return incidents.filter(inc => {
      const matchSearch = inc.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchSite = selectedSiteId === 'ALL' || inc.siteId === selectedSiteId;
      return matchSearch && matchSite;
    }).sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime());
  }, [incidents, searchQuery, selectedSiteId]);

  const paginatedIncidents = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredIncidents.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredIncidents, currentPage, itemsPerPage]);

  const filteredVisitors = useMemo(() => {
    return visitors.filter(v => {
      const matchSearch = v.visitorName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchSite = selectedSiteId === 'ALL' || v.siteId === selectedSiteId;
      return matchSearch && matchSite;
    }).sort((a, b) => new Date(b.entryTime || 0).getTime() - new Date(a.entryTime || 0).getTime());
  }, [visitors, searchQuery, selectedSiteId]);

  const paginatedVisitors = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredVisitors.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredVisitors, currentPage, itemsPerPage]);

  const filteredMaterials = useMemo(() => {
    return materials.filter(m => {
      const matchSearch = m.materialDescription.toLowerCase().includes(searchQuery.toLowerCase());
      const matchSite = selectedSiteId === 'ALL' || m.siteId === selectedSiteId;
      return matchSearch && matchSite;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [materials, searchQuery, selectedSiteId]);

  const paginatedMaterials = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredMaterials.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredMaterials, currentPage, itemsPerPage]);

  return (
`;

code = code.replace(/  return \(\n    <div className="flex-1 flex flex-col w-full h-full overflow-y-auto p-4 md:p-6 space-y-6">/, paginationLogic + '    <div className="flex-1 flex flex-col w-full h-full overflow-y-auto p-4 md:p-6 space-y-6">');

// Add useMemo to react imports
if (code.includes('import React, { useState, useEffect }')) {
  code = code.replace('import React, { useState, useEffect }', 'import React, { useState, useEffect, useMemo }');
}

fs.writeFileSync('src/components/screens/SiteOperationsScreen.tsx', code);
