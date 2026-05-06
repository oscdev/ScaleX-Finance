
async function run() {
  const email = 'john@oscprofessionals.in';
  const pass = 'Pass@!123';
  
  try {
    const hash = await strapi.service('admin::user').hashPassword(pass);
    console.log('Generated hash for', pass, ':', hash);
    
    const updated = await strapi.db.query('admin::user').update({
      where: { email },
      data: { password: hash, isActive: true }
    });
    
    console.log('Updated user:', updated ? 'SUCCESS' : 'NOT FOUND');
  } catch (err) {
    console.error('Error:', err);
  }
}

run();
