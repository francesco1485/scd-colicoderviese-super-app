import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import type { Session } from '@supabase/supabase-js';
import { supabase, supabaseConfigured } from './src/lib/supabase';
import { loadMyContext, type SCDMembershipContext } from './src/lib/context';
import {
  loadMobilePublicDashboard,
  type MobilePublicDashboard,
  type MatchData
} from './src/lib/publicApi';

const EMPTY_DASHBOARD: MobilePublicDashboard = Object.freeze({
  nextMatch: null,
  week: [],
  news: []
});

function formatDate(value: string): string {
  if (!value) return 'DATA IN AGGIORNAMENTO';
  const d = new Date(value + (value.length === 10 ? 'T12:00:00' : ''));
  if (Number.isNaN(d.getTime())) return value.toUpperCase();
  return new Intl.DateTimeFormat('it-IT', {
    weekday: 'short',
    day: '2-digit',
    month: 'short'
  }).format(d).toUpperCase();
}

function MatchCard({ match }: { match: MatchData | null }) {
  if (!match) {
    return (
      <View style={styles.card}>
        <Text style={styles.eyebrowGold}>PROSSIMA GARA</Text>
        <Text style={styles.cardTitle}>Dato in aggiornamento</Text>
        <Text style={styles.cardBody}>
          Nessuna gara viene inventata. La card si popola dalla fonte SCD verificata.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.card, styles.matchCard]}>
      <Text style={styles.eyebrowGold}>PROSSIMA GARA</Text>
      <View style={styles.matchGrid}>
        <View style={styles.teamCol}>
          <Text style={styles.clubMark}>SCD</Text>
          <Text style={styles.teamName}>{match.team}</Text>
        </View>
        <View style={styles.dateChip}>
          <Text style={styles.dateLabel}>{formatDate(match.date)}</Text>
          {!!match.time && <Text style={styles.matchTime}>{match.time}</Text>}
        </View>
        <View style={styles.teamCol}>
          <Text style={styles.opponentMark}>VS</Text>
          <Text style={styles.teamName}>{match.opponent}</Text>
        </View>
      </View>
      <Text style={styles.location}>📍 {match.location}</Text>
      <Pressable style={styles.goldButton}>
        <Text style={styles.goldButtonText}>VAI ALLA GARA</Text>
      </Pressable>
    </View>
  );
}

function TwinCard() {
  return (
    <View style={[styles.card, styles.twinCard]}>
      <View style={styles.twinTop}>
        <View>
          <Text style={styles.eyebrowSky}>SCD TWIN</Text>
          <Text style={styles.twinTitle}>Scintilla</Text>
          <Text style={styles.twinSub}>Il tuo compagno digitale SCD.</Text>
        </View>
        <View style={styles.twinOrb}>
          <Text style={styles.twinEmoji}>🦊</Text>
        </View>
      </View>
      <View style={styles.xpRow}>
        <Text style={styles.xpText}>Livello iniziale</Text>
        <Text style={styles.xpText}>3 XP</Text>
      </View>
      <View style={styles.xpTrack}>
        <View style={styles.xpFill} />
      </View>
      <View style={styles.twinMessage}>
        <Text style={styles.twinMessageText}>
          Ciao. Posso accompagnarti tra gare, calendario, servizi e mondo SCD.
        </Text>
      </View>
      <View style={styles.actionRow}>
        <Pressable style={styles.actionButton}>
          <Text style={styles.actionIcon}>🎯</Text>
          <Text style={styles.actionText}>Missioni</Text>
        </Pressable>
        <Pressable style={styles.actionButton}>
          <Text style={styles.actionIcon}>👕</Text>
          <Text style={styles.actionText}>Avatar</Text>
        </Pressable>
        <Pressable style={styles.actionButton}>
          <Text style={styles.actionIcon}>⭐</Text>
          <Text style={styles.actionText}>Esplora</Text>
        </Pressable>
      </View>
    </View>
  );
}

function WeekStrip({ dashboard }: { dashboard: MobilePublicDashboard }) {
  const rows = dashboard.week.slice(0, 6);
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <View>
          <Text style={styles.eyebrowBlue}>SETTIMANA SCD · TUTTE LE ANNATE</Text>
          <Text style={styles.sectionTitle}>Cosa succede questa settimana</Text>
        </View>
        <Text style={styles.linkText}>TUTTO ›</Text>
      </View>
      {rows.length ? (
        rows.map((item, index) => (
          <View key={item.date + item.time + item.title + index} style={styles.weekRow}>
            <View style={styles.weekDate}>
              <Text style={styles.weekDateTop}>{formatDate(item.date)}</Text>
              <Text style={styles.weekTime}>{item.time || '--:--'}</Text>
            </View>
            <View style={styles.weekMain}>
              <Text style={styles.weekMeta}>{item.team} · {item.type}</Text>
              <Text style={styles.weekTitle}>{item.title}</Text>
              <Text style={styles.weekSub}>
                {[item.opponent, item.venue].filter(Boolean).join(' · ') || 'Dettagli in aggiornamento'}
              </Text>
            </View>
          </View>
        ))
      ) : (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>Nessuna attività verificata caricata.</Text>
          <Text style={styles.emptyText}>Il calendario non viene riempito con dati finti.</Text>
        </View>
      )}
    </View>
  );
}

function Newsroom({ dashboard }: { dashboard: MobilePublicDashboard }) {
  const cards = dashboard.news.slice(0, 3);
  return (
    <View style={styles.section}>
      <Text style={styles.eyebrowBlue}>SCD NEWSROOM AI · SETTIMANALE</Text>
      <Text style={styles.sectionTitle}>News create dai fatti del Club</Text>
      <Text style={styles.sectionLead}>
        Risultati, classifiche, calendario e iniziative. Niente commenti riciclati da un sito datato.
      </Text>
      {cards.length ? cards.map((card, index) => (
        <View key={card.title + index} style={styles.newsCard}>
          <Text style={styles.newsCategory}>{card.category}</Text>
          <Text style={styles.newsTitle}>{card.title}</Text>
          {!!card.dek && <Text style={styles.newsDek}>{card.dek}</Text>}
          {!!card.body && <Text style={styles.newsBody}>{card.body}</Text>}
          <Text style={styles.newsEvidence}>{card.evidence.length} evidenze verificate</Text>
        </View>
      )) : (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>Nessuna news senza fatti.</Text>
          <Text style={styles.emptyText}>La Newsroom aspetta dati verificati prima di pubblicare.</Text>
        </View>
      )}
    </View>
  );
}

export default function App() {
  const [session,setSession]=useState<Session|null>(null);
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [context,setContext]=useState<SCDMembershipContext[]>([]);
  const [dashboard,setDashboard]=useState<MobilePublicDashboard>(EMPTY_DASHBOARD);
  const [busy,setBusy]=useState(true);
  const [loginBusy,setLoginBusy]=useState(false);
  const [message,setMessage]=useState('');
  const [showLogin,setShowLogin]=useState(false);

  useEffect(()=>{
    let mounted=true;

    Promise.allSettled([
      loadMobilePublicDashboard(),
      supabase.auth.getSession()
    ]).then((results)=>{
      if (!mounted) return;
      const publicResult=results[0];
      const authResult=results[1];

      if(publicResult.status==='fulfilled') setDashboard(publicResult.value);
      else setMessage(String(publicResult.reason?.message||publicResult.reason||''));

      if(authResult.status==='fulfilled') setSession(authResult.value.data.session);
      setBusy(false);
    });

    const {data:listener}=supabase.auth.onAuthStateChange((_event,next)=>{
      if(mounted) setSession(next);
    });

    return ()=>{mounted=false;listener.subscription.unsubscribe()};
  },[]);

  useEffect(()=>{
    if(!session){setContext([]);return}
    loadMyContext().then(setContext).catch(e=>setMessage(String(e?.message||e)));
  },[session]);

  const roleLabel=useMemo(()=>{
    const role=context[0]?.role;
    return role ? String(role).replaceAll('_',' ') : 'COMMUNITY';
  },[context]);

  async function signIn(){
    setLoginBusy(true);setMessage('');
    const {error}=await supabase.auth.signInWithPassword({email,password});
    if(error)setMessage(error.message);
    else setShowLogin(false);
    setLoginBusy(false);
  }

  async function signOut(){
    await supabase.auth.signOut();
  }

  if(!supabaseConfigured){
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.card}>
          <Text style={styles.eyebrowGold}>SCD PULSE</Text>
          <Text style={styles.cardTitle}>Configurazione mobile incompleta</Text>
          <Text style={styles.cardBody}>
            Mancano le variabili pubbliche Supabase. Nessun fallback inventato.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light"/>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.heroKicker}>SCD COLICODERVIESE</Text>
              <Text style={styles.heroTitle}>Più di un Club.</Text>
              <Text style={styles.heroSubtitle}>Sport · Famiglia · Territorio · Futuro</Text>
            </View>
            <View style={styles.profileBubble}>
              <Text style={styles.profileEmoji}>🦊</Text>
            </View>
          </View>
          <View style={styles.rolePill}>
            <Text style={styles.rolePillText}>{session ? roleLabel : 'AREA PUBBLICA'}</Text>
          </View>
          <Pressable
            style={styles.loginChip}
            onPress={()=>session ? signOut() : setShowLogin(v=>!v)}
          >
            <Text style={styles.loginChipText}>{session ? 'ESCI' : 'AREA RISERVATA'}</Text>
          </Pressable>
        </View>

        {busy && <ActivityIndicator style={{marginVertical:16}} color="#FFD84A"/>}

        {showLogin && !session && (
          <View style={styles.loginCard}>
            <Text style={styles.cardTitle}>Accedi al tuo mondo SCD</Text>
            <TextInput
              style={styles.input}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
            />
            <TextInput
              style={styles.input}
              secureTextEntry
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
            />
            <Pressable style={styles.goldButton} onPress={signIn}>
              <Text style={styles.goldButtonText}>{loginBusy ? 'ACCESSO…' : 'ACCEDI'}</Text>
            </Pressable>
          </View>
        )}

        <MatchCard match={dashboard.nextMatch}/>
        <TwinCard/>
        <WeekStrip dashboard={dashboard}/>
        <Newsroom dashboard={dashboard}/>

        {!!message && (
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>{message}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles=StyleSheet.create({
  safe:{flex:1,backgroundColor:'#07111F'},
  scroll:{paddingBottom:28,backgroundColor:'#F3F6FB'},
  hero:{backgroundColor:'#07111F',paddingHorizontal:18,paddingTop:18,paddingBottom:22,borderBottomLeftRadius:28,borderBottomRightRadius:28},
  heroTop:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start',gap:12},
  heroKicker:{color:'#FFD84A',fontWeight:'900',letterSpacing:1.4,fontSize:11},
  heroTitle:{color:'#FFFFFF',fontWeight:'900',fontSize:34,letterSpacing:-1.4,marginTop:6},
  heroSubtitle:{color:'#AFC7E7',fontSize:12,marginTop:4},
  profileBubble:{width:54,height:54,borderRadius:27,backgroundColor:'#12305E',alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'#204B86'},
  profileEmoji:{fontSize:28},
  rolePill:{alignSelf:'flex-start',marginTop:16,backgroundColor:'#102657',borderRadius:999,paddingHorizontal:11,paddingVertical:7},
  rolePillText:{color:'#FFFFFF',fontSize:10,fontWeight:'800',letterSpacing:.8},
  loginChip:{alignSelf:'flex-end',marginTop:-31,borderWidth:1,borderColor:'#2B4C78',borderRadius:999,paddingHorizontal:12,paddingVertical:8},
  loginChipText:{color:'#D6E7FF',fontSize:10,fontWeight:'800'},
  card:{marginHorizontal:14,marginTop:12,padding:16,borderRadius:22,backgroundColor:'#FFFFFF',borderWidth:1,borderColor:'#E0E7F0'},
  matchCard:{backgroundColor:'#0B1730',borderColor:'#173A70'},
  twinCard:{backgroundColor:'#0D1D3B',borderColor:'#1E4D8D'},
  cardTitle:{fontSize:23,fontWeight:'900',color:'#0B1730',letterSpacing:-.6},
  cardBody:{fontSize:13,lineHeight:19,color:'#64748B',marginTop:6},
  eyebrowGold:{color:'#FFD84A',fontSize:10,fontWeight:'900',letterSpacing:1.2},
  eyebrowSky:{color:'#38BDF8',fontSize:10,fontWeight:'900',letterSpacing:1.1},
  eyebrowBlue:{color:'#0A6CFF',fontSize:10,fontWeight:'900',letterSpacing:1.1},
  matchGrid:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8,marginTop:16},
  teamCol:{flex:1,alignItems:'center'},
  clubMark:{color:'#FFD84A',fontSize:20,fontWeight:'900'},
  opponentMark:{color:'#38BDF8',fontSize:16,fontWeight:'900'},
  teamName:{color:'#FFFFFF',fontSize:12,fontWeight:'700',textAlign:'center',marginTop:6},
  dateChip:{backgroundColor:'#13284D',borderRadius:14,paddingHorizontal:10,paddingVertical:10,alignItems:'center'},
  dateLabel:{color:'#FFFFFF',fontSize:10,fontWeight:'800'},
  matchTime:{color:'#FFD84A',fontSize:18,fontWeight:'900',marginTop:3},
  location:{color:'#AFC7E7',fontSize:12,marginTop:14,textAlign:'center'},
  goldButton:{backgroundColor:'#FFD84A',paddingVertical:13,paddingHorizontal:16,borderRadius:14,alignItems:'center',marginTop:14},
  goldButtonText:{color:'#07111F',fontWeight:'900',fontSize:12},
  twinTop:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
  twinTitle:{color:'#FFFFFF',fontSize:28,fontWeight:'900',letterSpacing:-.8,marginTop:3},
  twinSub:{color:'#AFC7E7',fontSize:12,marginTop:3},
  twinOrb:{width:74,height:74,borderRadius:37,backgroundColor:'#0A6CFF',alignItems:'center',justifyContent:'center',borderWidth:6,borderColor:'#12305E'},
  twinEmoji:{fontSize:38},
  xpRow:{flexDirection:'row',justifyContent:'space-between',marginTop:16},
  xpText:{color:'#AFC7E7',fontSize:10,fontWeight:'700'},
  xpTrack:{height:8,borderRadius:999,backgroundColor:'#1F3558',marginTop:7,overflow:'hidden'},
  xpFill:{width:'18%',height:'100%',backgroundColor:'#FFD84A',borderRadius:999},
  twinMessage:{backgroundColor:'#142A50',borderRadius:16,padding:13,marginTop:16},
  twinMessageText:{color:'#D9E8FB',fontSize:12,lineHeight:18},
  actionRow:{flexDirection:'row',gap:8,marginTop:14},
  actionButton:{flex:1,backgroundColor:'#102657',borderRadius:16,paddingVertical:13,alignItems:'center',borderWidth:1,borderColor:'#1D4B8C'},
  actionIcon:{fontSize:20},
  actionText:{color:'#FFFFFF',fontSize:10,fontWeight:'800',marginTop:5},
  section:{marginTop:18,paddingHorizontal:14},
  sectionHead:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-end',gap:10},
  sectionTitle:{fontSize:25,fontWeight:'900',color:'#0B1730',letterSpacing:-.8,marginTop:3,flexShrink:1},
  sectionLead:{fontSize:12,lineHeight:18,color:'#64748B',marginTop:7},
  linkText:{color:'#0A6CFF',fontSize:10,fontWeight:'900'},
  weekRow:{flexDirection:'row',gap:12,backgroundColor:'#FFFFFF',borderRadius:18,padding:13,marginTop:9,borderWidth:1,borderColor:'#E1E8F2'},
  weekDate:{width:82,backgroundColor:'#EEF4FF',borderRadius:14,padding:10,alignItems:'center',justifyContent:'center'},
  weekDateTop:{color:'#0B1730',fontSize:9,fontWeight:'900',textAlign:'center'},
  weekTime:{color:'#0A6CFF',fontSize:16,fontWeight:'900',marginTop:3},
  weekMain:{flex:1},
  weekMeta:{color:'#0A6CFF',fontSize:9,fontWeight:'900',letterSpacing:.5},
  weekTitle:{color:'#0B1730',fontSize:15,fontWeight:'900',marginTop:4},
  weekSub:{color:'#6B7A90',fontSize:11,lineHeight:16,marginTop:4},
  newsCard:{backgroundColor:'#FFFFFF',borderRadius:20,padding:15,marginTop:10,borderWidth:1,borderColor:'#E1E8F2'},
  newsCategory:{color:'#0A6CFF',fontSize:9,fontWeight:'900',letterSpacing:1},
  newsTitle:{color:'#0B1730',fontSize:18,fontWeight:'900',marginTop:5,letterSpacing:-.3},
  newsDek:{color:'#334155',fontSize:12,fontWeight:'700',lineHeight:18,marginTop:6},
  newsBody:{color:'#64748B',fontSize:12,lineHeight:18,marginTop:7},
  newsEvidence:{color:'#16A36A',fontSize:10,fontWeight:'800',marginTop:10},
  emptyBox:{backgroundColor:'#F8FAFD',borderRadius:18,padding:15,marginTop:10,borderWidth:1,borderColor:'#E1E8F2'},
  emptyTitle:{color:'#0B1730',fontSize:14,fontWeight:'800'},
  emptyText:{color:'#64748B',fontSize:11,lineHeight:17,marginTop:4},
  loginCard:{marginHorizontal:14,marginTop:12,padding:16,borderRadius:22,backgroundColor:'#FFFFFF',borderWidth:1,borderColor:'#E0E7F0'},
  input:{borderWidth:1,borderColor:'#D5DFEA',borderRadius:14,paddingHorizontal:14,paddingVertical:12,backgroundColor:'#FFFFFF',marginTop:10},
  warningBox:{margin:14,padding:12,borderRadius:14,backgroundColor:'#FFF4E5'},
  warningText:{color:'#8A4B08',fontSize:11,lineHeight:16}
});
