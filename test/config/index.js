var mod = {};

mod.fqdn = 'mail.example.com';

mod.smtp = {};

mod.smtp.accounts = [];
mod.smtp.accounts.push('accept@example.com');
mod.smtp.accounts.push('reject@example.com');

mod.smtp.banner = 'Howdy partner!';

mod.smtp.fqdn = 'mail.example.com';

module.exports = mod;
