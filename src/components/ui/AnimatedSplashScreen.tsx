import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  StatusBar,
} from 'react-native';

const { width, height } = Dimensions.get('window');

interface Props {
  onFinish?: () => void;
  minDurationMs?: number;
}

export default function AnimatedSplashScreen({ onFinish, minDurationMs = 1800 }: Props) {
  // Animaciones
  const containerOpacity = useRef(new Animated.Value(1)).current;
  const logoScale = useRef(new Animated.Value(0.75)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const haloScale = useRef(new Animated.Value(0.85)).current;
  const haloOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(12)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. Halo respirando en loop sutil
    const haloAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(haloScale, {
          toValue: 1.15,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(haloScale, {
          toValue: 0.95,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    haloAnim.start();

    // 2. Entrada del logo (escala elástica + fade-in)
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(haloOpacity, {
        toValue: 0.7,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // 3. Entrada de los textos de marca poco después
    Animated.parallel([
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 600,
        delay: 250,
        useNativeDriver: true,
      }),
      Animated.timing(textTranslateY, {
        toValue: 0,
        duration: 600,
        delay: 250,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();

    // 4. Barra de progreso que se llena
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: minDurationMs - 300,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: false,
    }).start();

    // 5. Salida suave (fade-out): logo, círculo y contenedor desaparecen al mismo tiempo
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(containerOpacity, {
          toValue: 0,
          duration: 350,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 0,
          duration: 350,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(haloOpacity, {
          toValue: 0,
          duration: 350,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start(() => {
        haloAnim.stop();
        onFinish?.();
      });
    }, minDurationMs);

    return () => {
      clearTimeout(timer);
      haloAnim.stop();
    };
  }, [minDurationMs, onFinish]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View style={[styles.container, { opacity: containerOpacity }]} pointerEvents="none">
      <StatusBar barStyle="light-content" backgroundColor="#0F1117" translucent />

      {/* Contenido Central: Logo y Marca */}
      <View style={styles.centerBox}>
        {/* Halo resplandor detrás del logo */}
        <Animated.View
          style={[
            styles.halo,
            {
              opacity: haloOpacity,
              transform: [{ scale: haloScale }],
            },
          ]}
        />

        {/* Logo oficial Aphelios con fondo circular blanco difuminado */}
        <Animated.View
          style={[
            styles.logoWrapper,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          {/* Difuminado exterior suave */}
          <View style={styles.whiteGlowOuter} />
          {/* Círculo blanco algo más pequeño que el logo */}
          <View style={styles.whiteCircle} />

          <Image
            source={require('../../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Nombre y Slogan */}
        <Animated.View
          style={[
            styles.textBox,
            {
              opacity: textOpacity,
              transform: [{ translateY: textTranslateY }],
            },
          ]}
        >
          <Text style={styles.brandTitle}>APHELIOS</Text>
          <Text style={styles.brandSubtitle}>Mejora tus finanzas</Text>
        </Animated.View>
      </View>

      {/* Barra de progreso e indicador inferior */}
      <View style={styles.footer}>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressBar, { width: progressWidth }]} />
        </View>
        <Text style={styles.loadingText}>Iniciando tu espacio…</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0F1117',
    zIndex: 99999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(0, 200, 150, 0.16)',
    top: -20,
  },
  logoWrapper: {
    width: 130,
    height: 130,
    alignItems: 'center',
    justifyContent: 'center',
  },
  whiteGlowOuter: {
    position: 'absolute',
    width: 114,
    height: 114,
    borderRadius: 57,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  whiteCircle: {
    position: 'absolute',
    width: 95,
    height: 95,
    borderRadius: 47.5,
    backgroundColor: '#ffffff',
  },
  logo: {
    width: 130,
    height: 130,
  },
  textBox: {
    alignItems: 'center',
    marginTop: 20,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 6,
    textTransform: 'uppercase',
  },
  brandSubtitle: {
    fontSize: 10,
    fontWeight: '600',
    color: '#00c896',
    letterSpacing: 3,
    marginTop: 6,
    textTransform: 'uppercase',
  },
  footer: {
    position: 'absolute',
    bottom: 50,
    alignItems: 'center',
  },
  progressTrack: {
    width: 130,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#00c896',
    borderRadius: 2,
  },
  loadingText: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 10,
    letterSpacing: 0.5,
  },
});
