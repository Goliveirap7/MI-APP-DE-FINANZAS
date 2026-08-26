/**
 * RootNavigator — Tab bar principal con íconos emoji y colores del design system.
 *
 * Flujo futuro:
 *  Sin sesión  → AuthStack
 *  Con sesión  → MainTabs (este archivo)
 */
import React from 'react';
import { Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { FontSize, type ThemeColors } from '../constants/theme';

import HomeScreen           from '../screens/Home/HomeScreen';
import AddTransactionScreen from '../screens/AddTransaction/AddTransactionScreen';
import BudgetScreen         from '../screens/Budget/BudgetScreen';
import DebtsScreen          from '../screens/Debts/DebtsScreen';
import InvestmentsScreen    from '../screens/Investments/InvestmentsScreen';
import AnnualSummaryScreen  from '../screens/AnnualSummary/AnnualSummaryScreen';

import AuthScreen           from '../screens/Auth/AuthScreen';
import { useAuth }          from '../context/AuthContext';
import { createStackNavigator } from '@react-navigation/stack';
import { useSyncEngine }    from '../hooks/useSyncEngine';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const TAB_ICONS: Record<string, string> = {
  Home:           '🏠',
  Budget:         '📊',
  AnnualSummary:  '📅',
};

function MainTabs() {
  useSyncEngine(); // Inicia el motor de sincronización al cargar los tabs principales
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => (
          <Text
            style={{
              fontSize: 20,
              opacity: focused ? 1 : 0.5,
            }}
          >
            {TAB_ICONS[route.name]}
          </Text>
        ),
        tabBarLabel: ({ focused, color }) => {
          const labels: Record<string, string> = {
            Home:           'Inicio',
            Budget:         'Presupuesto',
            AnnualSummary:  'Reportes',
          };
          return (
            <Text
              style={{
                fontSize: 10,
                color,
                marginBottom: 2,
              }}
            >
              {labels[route.name]}
            </Text>
          );
        },
        tabBarStyle: {
          backgroundColor: colors.bgCard,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 62,
          paddingBottom: 6,
          paddingTop: 6,
        },
        tabBarActiveTintColor:   colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      })}
    >
      <Tab.Screen name="Home"           component={HomeScreen} />
      <Tab.Screen name="Budget"         component={BudgetScreen} />
      <Tab.Screen name="AnnualSummary"  component={AnnualSummaryScreen} />
    </Tab.Navigator>
  );
}

import CategoryDetailScreen from '../screens/CategoryDetail/CategoryDetailScreen';
import TransactionDetailScreen from '../screens/TransactionDetail/TransactionDetailScreen';
import ProfileScreen from '../screens/Profile/ProfileScreen';
import BalanceDetailScreen from '../screens/BalanceDetail/BalanceDetailScreen';
import { useTheme } from '../context/ThemeContext';

export default function RootNavigator() {
  const { session, loading } = useAuth();

  // If loading session state from AsyncStorage, you might want to return null or a splash screen
  if (loading) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {session ? (
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen name="CategoryDetail" component={CategoryDetailScreen} />
            <Stack.Screen name="AddTransaction" component={AddTransactionScreen} />
            <Stack.Screen name="TransactionDetail" component={TransactionDetailScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="BalanceDetail" component={BalanceDetailScreen} />
            <Stack.Screen name="Debts" component={DebtsScreen} />
            <Stack.Screen name="Investments" component={InvestmentsScreen} />
          </>
        ) : (
          <Stack.Screen name="Auth" component={AuthScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
