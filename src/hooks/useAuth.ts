import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface User {
  id: string;
  email: string;
  fullName: string;
  companyName: string;
  role: 'customer_admin' | 'master_admin' | 'project_manager' | 'analyst';
  customerId?: string;
  isMasterAdmin?: boolean;
  avatar?: string;
  createdAt: string;
  subscription: {
    plan: 'starter' | 'pro' | 'enterprise';
    maxProjects: number;
    maxStakeholders: number;
    maxQuestions: number;
    maxFileSize: number;
    maxRecordingMinutes: number;
    status: 'active' | 'paused' | 'trial';
  };
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🔄 Auth hook initializing...');

    const initAuth = async () => {
      try {
        console.log('🔍 Getting current session...');

        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('❌ Session error:', error);
          setUser(null);
          setLoading(false);
          return;
        }

        if (session?.user) {
          console.log('✅ Session found, fetching user data from database...');

          // Add timeout to prevent hanging
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Database query timeout')), 1500)
          );

          let dbUser = null;

          try {
            // Fetch user data from database to get current is_master_admin status
            const result = await Promise.race([
              supabase
                .from('users')
                .select('full_name, company_name, role, is_master_admin, customer_id')
                .eq('id', session.user.id)
                .maybeSingle(),
              timeoutPromise
            ]) as any;

            dbUser = result?.data;

            if (result?.error) {
              console.error('❌ Database user fetch error:', result.error);
            }
          } catch (timeoutError) {
            console.error('⏱️ Database query timed out, using session data only');
          }

          console.log('📊 Database user data:', dbUser);

          // Fetch customer subscription data
          let customerData = null;
          if (dbUser?.customer_id) {
            try {
              const customerResult = await Promise.race([
                supabase
                  .from('customers')
                  .select('subscription_plan, subscription_status, max_projects, max_stakeholders')
                  .eq('id', dbUser.customer_id)
                  .maybeSingle(),
                new Promise((_, reject) =>
                  setTimeout(() => reject(new Error('Customer query timeout')), 1000)
                )
              ]) as any;

              customerData = customerResult?.data;
              console.log('📦 Customer subscription data:', customerData);
            } catch (error) {
              console.error('⏱️ Customer data query timed out or failed:', error);
            }
          }

          // Get plan limits from subscription_plans table
          let planLimits = null;
          if (customerData?.subscription_plan) {
            try {
              const planResult = await Promise.race([
                supabase
                  .from('subscription_plans')
                  .select('*')
                  .eq('plan_code', customerData.subscription_plan)
                  .maybeSingle(),
                new Promise((_, reject) =>
                  setTimeout(() => reject(new Error('Plan query timeout')), 1000)
                )
              ]) as any;

              planLimits = planResult?.data;
              console.log('📋 Plan limits:', planLimits);
            } catch (error) {
              console.error('⏱️ Plan query timed out or failed:', error);
            }
          }

          const userData: User = {
            id: session.user.id,
            email: session.user.email || '',
            fullName: dbUser?.full_name || session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
            companyName: dbUser?.company_name || session.user.user_metadata?.company_name || 'Company',
            role: dbUser?.role || (dbUser?.is_master_admin ? 'master_admin' : 'customer_admin'),
            customerId: dbUser?.customer_id,
            isMasterAdmin: dbUser?.is_master_admin === true,
            createdAt: session.user.created_at || new Date().toISOString(),
            subscription: {
              plan: (customerData?.subscription_plan || user?.subscription.plan || 'starter') as 'starter' | 'pro' | 'enterprise',
              maxProjects: customerData?.max_projects || planLimits?.max_projects || user?.subscription.maxProjects || 3,
              maxStakeholders: customerData?.max_stakeholders || planLimits?.max_stakeholders_per_project || user?.subscription.maxStakeholders || 15,
              maxQuestions: planLimits?.max_questions_per_project || user?.subscription.maxQuestions || 50,
              maxFileSize: planLimits?.max_file_size_mb || user?.subscription.maxFileSize || 100,
              maxRecordingMinutes: planLimits?.max_recording_minutes || user?.subscription.maxRecordingMinutes || 5,
              status: (customerData?.subscription_status || user?.subscription.status || 'trial') as 'active' | 'paused' | 'trial'
            }
          }

          console.log('👤 Final user data:', {
            isMasterAdmin: userData.isMasterAdmin,
            role: userData.role,
            subscription: userData.subscription
          });

          setUser(userData);
          setLoading(false);
        } else {
          console.log('ℹ️ No session found');
          setUser(null);
          setLoading(false);
        }
      } catch (error) {
        console.error('💥 Auth initialization failed:', error);
        setUser(null);
        setLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state change:', event);

      if (event === 'SIGNED_IN' && session?.user) {
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Database query timeout')), 1500)
        );

        let dbUser = null;

        try {
          // Fetch user data from database to get current is_master_admin status
          const result = await Promise.race([
            supabase
              .from('users')
              .select('full_name, company_name, role, is_master_admin, customer_id')
              .eq('id', session.user.id)
              .maybeSingle(),
            timeoutPromise
          ]) as any;

          dbUser = result?.data;

          if (result?.error) {
            console.error('❌ Database error in auth state change:', result.error);
          }
        } catch (error) {
          console.error('⏱️ Database query timed out in auth state change, using session data only');
        }

        // Fetch customer subscription data
        let customerData = null;
        if (dbUser?.customer_id) {
          try {
            const { data: custData } = await supabase
              .from('customers')
              .select('subscription_plan, subscription_status, max_projects, max_stakeholders')
              .eq('id', dbUser.customer_id)
              .maybeSingle();
            customerData = custData;
          } catch (error) {
            console.error('Error fetching customer data:', error);
          }
        }

        // Get plan limits from subscription_plans table
        let planLimits = null;
        if (customerData?.subscription_plan) {
          try {
            const { data: plan } = await supabase
              .from('subscription_plans')
              .select('*')
              .eq('plan_code', customerData.subscription_plan)
              .maybeSingle();
            planLimits = plan;
          } catch (error) {
            console.error('Error fetching plan limits:', error);
          }
        }

        const userData: User = {
          id: session.user.id,
          email: session.user.email || '',
          fullName: dbUser?.full_name || session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
          companyName: dbUser?.company_name || session.user.user_metadata?.company_name || 'Company',
          role: dbUser?.role || (dbUser?.is_master_admin ? 'master_admin' : 'customer_admin'),
          customerId: dbUser?.customer_id,
          isMasterAdmin: dbUser?.is_master_admin === true,
          createdAt: session.user.created_at || new Date().toISOString(),
          subscription: {
            plan: (customerData?.subscription_plan || user?.subscription.plan || 'starter') as 'starter' | 'pro' | 'enterprise',
            maxProjects: customerData?.max_projects || planLimits?.max_projects || user?.subscription.maxProjects || 3,
            maxStakeholders: customerData?.max_stakeholders || planLimits?.max_stakeholders_per_project || user?.subscription.maxStakeholders || 15,
            maxQuestions: planLimits?.max_questions_per_project || user?.subscription.maxQuestions || 50,
            maxFileSize: planLimits?.max_file_size_mb || user?.subscription.maxFileSize || 100,
            maxRecordingMinutes: planLimits?.max_recording_minutes || user?.subscription.maxRecordingMinutes || 5,
            status: (customerData?.subscription_status || user?.subscription.status || 'trial') as 'active' | 'paused' | 'trial'
          }
        };
        setUser(userData);
        setLoading(false);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const getUserSubscriptionPlan = async (userId: string) => {
    try {
      // Get user's current plan from access code or default
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (!userData) {
        return {
          plan: 'starter',
          maxProjects: 3,
          maxStakeholders: 15,
          maxQuestions: 50,
          maxFileSize: 100,
          maxRecordingMinutes: 5,
          status: 'trial'
        };
      }

      // For now, return default starter plan
      // In production, you'd look up the actual subscription
      return {
        plan: 'starter',
        maxProjects: 3,
        maxStakeholders: 15,
        maxQuestions: 50,
        maxFileSize: 100,
        maxRecordingMinutes: 5,
        status: 'trial'
      };
    } catch (error) {
      console.error('Error getting subscription plan:', error);
      return {
        plan: 'starter',
        maxProjects: 3,
        maxStakeholders: 15,
        maxQuestions: 50,
        maxFileSize: 100,
        maxRecordingMinutes: 5,
        status: 'trial'
      };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔐 Signing in...');
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        console.error('❌ Sign in error:', error);
        return { user: null, error: error.message };
      }

      console.log('✅ Sign in successful');
      return { user: data.user, error: null };
    } catch (error) {
      console.error('💥 Sign in failed:', error);
      return { user: null, error: error instanceof Error ? error.message : 'Authentication failed' };
    }
  }
  const signUp = async (email: string, password: string, companyName: string, fullName: string, accessCode?: string) => {
    try {
      console.log('📝 Signing up...');
      
      // Validate access code first if provided
      if (accessCode) {
        const { data: validationData, error: validationError } = await supabase
          .rpc('validate_access_code', { code_input: accessCode });

        if (validationError || !validationData?.valid) {
          return { 
            user: null, 
            error: validationData?.error || 'Invalid access code. Please contact the Speak team for a valid access code.' 
          };
        }
      } else {
        return { 
          user: null, 
          error: 'Access code required. Please contact the Speak team to get an access code for account creation.' 
        };
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            company_name: companyName,
            is_master_admin: false,
            access_code: accessCode
          }
        }
      });
      
      if (error) {
        console.error('❌ Sign up error:', error);
        return { user: null, error: error.message };
      }

      // Create user record and customer with proper plan
      if (data.user) {
        // Get plan details from access code validation
        const { data: codeValidation } = await supabase
          .rpc('validate_access_code', { code_input: accessCode });

        try {
          // First create the customer record with plan from access code
          const { data: customerData, error: customerError } = await supabase
            .from('customers')
            .insert({
              name: companyName,
              owner_id: data.user.id,
              subscription_plan: codeValidation?.plan_code || 'starter',
              subscription_status: 'active',
              max_projects: codeValidation?.max_projects || 3,
              max_stakeholders: codeValidation?.max_stakeholders || 15,
              access_code_used: accessCode,
              billing_contact_email: data.user.email!
            })
            .select()
            .single();

          if (customerError) {
            console.error('❌ Error creating customer:', customerError);
          } else {
            console.log('✅ Customer created with plan:', codeValidation?.plan_code);
          }

          // Then create user profile and link to customer
          const { error: userError } = await supabase
            .from('users')
            .insert({
              id: data.user.id,
              customer_id: customerData?.id,
              email: data.user.email!,
              full_name: fullName,
              company_name: companyName,
              role: 'customer_admin',
              is_master_admin: false
            });

          if (userError) {
            console.error('❌ Error creating user profile:', userError);
          } else {
            console.log('✅ User profile created successfully');
          }

          // Create customer_users junction record
          if (customerData) {
            const { error: junctionError } = await supabase
              .from('customer_users')
              .insert({
                customer_id: customerData.id,
                user_id: data.user.id,
                role: 'customer_admin',
                joined_at: new Date().toISOString()
              });

            if (junctionError) {
              console.error('❌ Error creating customer_users link:', junctionError);
            }
          }

          // Consume the access code
          await supabase.rpc('consume_access_code', {
            code_input: accessCode,
            user_id_input: data.user.id
          });

        } catch (profileError) {
          console.error('💥 User/customer creation failed:', profileError);
          // Continue anyway - the auth user was created successfully
        }
      }

      console.log('✅ Sign up successful');
      return { user: data.user, error: null };
    } catch (error) {
      console.error('💥 Sign up failed:', error);
      return { user: null, error: error instanceof Error ? error.message : 'Registration failed' };
    }
  };

  const signOut = async () => {
    try {
      console.log('🚪 Signing out...');
      await supabase.auth.signOut();
      setUser(null);
      localStorage.clear();
      window.location.reload();
    } catch (error) {
      console.error('💥 Sign out error:', error);
      setUser(null);
      localStorage.clear();
      window.location.reload();
    }
  };

  return {
    user,
    loading,
    signIn,
    signUp,
    signOut
  };
};