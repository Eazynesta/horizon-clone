export function createSupportService(accounts) {
  const client=accounts.client;
  async function user() {
    const current=await accounts.user({fresh:true});
    if (!current) throw Error('Sign in to send and read support messages.');
    return current;
  }
  async function checked(query) {
    const {data,error}=await query;
    if (error) throw Error(error.message);
    return data;
  }
  return {
    async mine() {
      const current=await user();
      return checked(client.from('support_requests')
        .select('id,body,created_at,support_replies(id,body,created_at)')
        .eq('user_id',current.id).order('created_at',{ascending:false}).order('id').limit(20));
    },
    async send(body) {
      await user();
      await checked(client.from('support_requests').insert({body}));
    },
    async inbox(offset) {
      const current=await user();
      const admin=await checked(client.from('finance_admin_memberships').select('user_id').eq('user_id',current.id).maybeSingle());
      if (!admin) throw Error('Administrator access required.');
      return checked(client.from('support_requests')
        .select('id,user_id,body,created_at,support_replies(id)')
        .order('created_at',{ascending:false}).order('id').range(offset,offset+20));
    },
    async replies(requestId) {
      await user();
      return checked(client.from('support_replies').select('id,body,created_at')
        .eq('request_id',requestId).order('created_at').order('id'));
    },
    async reply(requestId,body) {
      await user();
      await checked(client.from('support_replies').insert({request_id:requestId,body}));
    }
  };
}
