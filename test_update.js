const token = process.env.TOKEN;
fetch('http://127.0.0.1:1337/content-manager/collection-types/api::lead.lead/lwid7dlyynhksx8eijswz133', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ status: "APPROVED", remarks: [] })
}).then(r => r.text()).then(console.log).catch(console.error);
