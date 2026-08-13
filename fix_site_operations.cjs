const fs = require('fs');
let code = fs.readFileSync('src/components/screens/SiteOperationsScreen.tsx', 'utf8');

// Ensure Pagination is imported
if (!code.includes('import { Pagination }')) {
  code = code.replace(
    /import \{\s*Building2,/s,
    `import { Pagination } from '../common/Pagination';\nimport {\n  Building2,`
  );
  if (!code.includes('import { Pagination }')) {
     code = `import { Pagination } from '../common/Pagination';\n` + code;
  }
}


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
    }).sort((a, b) => new Date(b.entryTime).getTime() - new Date(a.entryTime).getTime());
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

  return (`

code = code.replace(/  return \(/, paginationLogic);

fs.writeFileSync('src/components/screens/SiteOperationsScreen.tsx', code);
