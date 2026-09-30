import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import type { Session } from '@supabase/supabase-js';
import { supabase, supabaseConfigured } from './src/lib/supabase';
import { loadMyContext, type SCDMembershipContext } from './src/lib/context';

export default function App() {
  const [session,setSession]=useState<Session|null>(null);
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [context,setContext]=useState<SCDMembershipContext[]>([]);
  const [busy,setBusy]=useState(true);
  const [message,setMessage]=useState('');

  useEffect(()=>{
    let mounted=true;
    supabase.auth.getSession().then(({data})=>{
      if(mounted){ setSession(data.session); setBusy(false); }
    });
    const {data:listener}=supabase.auth.onAuthStateChange((_event,next)=>{
      if(mounted) setSession(next);
    });
    return ()=>{ mounted=false; listener.subscription.unsubscribe(); };
  },[]);

  useEffect(()=>{
    if(!session){ setContext([]); return; }
    setBusy(true);
    loadMyContext()
      .then(setContext)
      .catch(e=>setMessage(String(e?.message||e)))
      .finally(()=>setBusy(false));
  },[session]);

  async function signIn(){
    setBusy(true); setMessage('');
    const {error}=await supabase.auth.signInWithPassword({email,password});
    if(error) setMessage(error.message);
    setBusy(false);
  }

  async function signOut(){
    setBusy(true);
    await supabase.auth.signOut();
    setBusy(false);
  }

  if(!supabaseConfigured){
    return <SafeAreaView style={styles.safe}><View style={styles.card}>
      <Text style={styles.kicker}>SCD PULSE</Text>
      <Text style={styles.title}>Configurazione mobile incompleta</Text>
      <Text style={styles.body}>Impostare EXPO_PUBLIC_SCD_SUPABASE_URL e EXPO_PUBLIC_SCD_SUPABASE_PUBLISHABLE_KEY. Nessun fallback inventato.</Text>
    </View></SafeAreaView>;
  }

  return <SafeAreaView style={styles.safe}>
    <StatusBar style="light"/>
    <View style={styles.header}>
      <Text style={styles.kicker}>S.D.C. COLICODERVIESE</Text>
      <Text style={styles.brand}>SCD PULSE</Text>
      <Text style={styles.sub}>Android / iOS · Supabase dark dual-run</Text>
    </View>
    <View style={styles.content}>
      {busy && <ActivityIndicator/>}
      {!session ? <View style={styles.card}>
        <Text style={styles.title}>Area riservata</Text>
        <Text style={styles.body}>Il nuovo accesso Supabase è ancora in fase di migrazione controllata. R20 resta il motore operativo primario.</Text>
        <TextInput style={styles.input} autoCapitalize="none" keyboardType="email-address" placeholder="Email" value={email} onChangeText={setEmail}/>
        <TextInput style={styles.input} secureTextEntry placeholder="Password" value={password} onChangeText={setPassword}/>
        <Pressable style={styles.button} onPress={signIn}><Text style={styles.buttonText}>ACCEDI</Text></Pressable>
      </View> : <View style={styles.card}>
        <Text style={styles.title}>Il tuo contesto SCD</Text>
        {context.length ? context.map((x)=><View key={x.organization_id} style={styles.contextRow}>
          <Text style={styles.contextRole}>{x.role}</Text>
          <Text>{x.organization_slug}</Text>
          <Text style={styles.scope}>Scope: {JSON.stringify(x.scope)}</Text>
        </View>) : <Text style={styles.body}>Membership non ancora disponibile. Stato UNVERIFIED.</Text>}
        <Pressable style={styles.secondary} onPress={signOut}><Text style={styles.secondaryText}>Esci</Text></Pressable>
      </View>}
      {!!message && <Text style={styles.error}>{message}</Text>}
    </View>
  </SafeAreaView>;
}

const styles=StyleSheet.create({
  safe:{flex:1,backgroundColor:'#052A67'},
  header:{paddingHorizontal:20,paddingTop:20,paddingBottom:24},
  kicker:{color:'#FFD500',fontWeight:'800',letterSpacing:1.2,fontSize:11},
  brand:{color:'#FFFFFF',fontWeight:'900',fontSize:36,marginTop:4},
  sub:{color:'#D7E7FF',marginTop:4},
  content:{flex:1,backgroundColor:'#EEF4FB',padding:16},
  card:{backgroundColor:'#FFFFFF',borderRadius:20,padding:18,gap:12},
  title:{fontSize:24,fontWeight:'900',color:'#052A67'},
  body:{color:'#4B5F7D',lineHeight:21},
  input:{borderWidth:1,borderColor:'#C8D7E8',borderRadius:12,paddingHorizontal:14,paddingVertical:12,backgroundColor:'#FFFFFF'},
  button:{backgroundColor:'#FFD500',padding:14,borderRadius:12,alignItems:'center'},
  buttonText:{fontWeight:'900',color:'#052A67'},
  secondary:{borderWidth:1,borderColor:'#052A67',padding:12,borderRadius:12,alignItems:'center'},
  secondaryText:{fontWeight:'800',color:'#052A67'},
  contextRow:{paddingVertical:10,borderBottomWidth:1,borderBottomColor:'#E4ECF5'},
  contextRole:{fontWeight:'900',color:'#075FD0'},
  scope:{fontSize:12,color:'#60708A',marginTop:4},
  error:{marginTop:12,color:'#9D1C1C',fontWeight:'700'}
});
