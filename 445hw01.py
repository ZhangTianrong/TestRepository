#!/usr/bin/env python

"""
EECS 445 - Introduction to Maching Learning
HW1 Q5 Linear Regression Optimization Methods)
~~~~~~
Follow the instructions in the homework to complete the assignment.
"""

import numpy as np
import matplotlib.pyplot as plt
import pandas as pd
import time

def load_data(fname):
    """
    Loads the data in file specified by `fname`. The file specified should be a csv with n rows and (d+1) columns,
    with the first column being label/output

    Returns X: an nxd array, where n is the number of examples and d is the dimensionality.
            y: an nx1 array, where n is the number of examples
    """
    data = pd.read_csv(fname).values
    X = data[:, 1:]
    y = data[:, 0]
    return X, y

def calculate_RMS_Error(X, y, theta):
    """
    Given (nxd) matrix X and (nx1) vector y, and (dx1) vector theta specificying an (d-1)^th degree polynomial,
    calculates the root mean square error as defined in the assignment. Returns the error as a float.
    """
    # TODO: Implement this function

    n = X.shape[0]
    E = np.sum((np.dot(X, theta) - y) ** 2)
    E_rms = np.sqrt(E/n)

    return E_rms


def generate_polynomial_features(X, M):
    """
    Given (nx1) matrix X and an integer M, maps each element of X to an (M+1)-dimensional polynomial feature vector
    i.e. [1, x, x^2, ...,x^M] where x is an element of X
    Returns the mapped data as an nx(M+1) matrix
    """
    # TODO: Implement this function

    # debugging
    feature = np.transpose(np.array([X**i for i in range(M + 1)]))

    return feature[0]


def ls_stochastic_gradient_descent(X, y, learning_rate=0, learning_scheme = False):
    """
    Given (nxd) array X and (nx1) array y, finds the coefficients of a (d-1)^th degree polynomial
    that fits the data using least squares stochastic graident descent.
    Returns a (dx1) array of the coefficients
    Note:
        - Please do not shuffle your data points.
        - Please use the stopping criteria: number of iterations >= 1e5 or |new_loss − prev_loss| <= 1e−10
    """
    # TODO: Implement this function

    n,d = X.shape
    theta = np.zeros((d,))
    prev_loss = np.sum((np.dot(X,theta) - y)**2)/(2*n)
    num_iteration = 0
    while True:
        num_iteration += 1
        for i in range(n):
            grad = (np.dot(theta, X[i]) - y[i]) * X[i]
            if learning_scheme:
                learning_rate = (1-(1-1E-3)*num_iteration*1E-4)/1E1
            theta -= learning_rate * grad

        new_loss = np.sum((np.dot(X,theta) - y)**2)/(2*n)
        if np.abs(new_loss - prev_loss) <= 1E-10 or num_iteration >= 1E5:
            break;
        else:
            prev_loss = new_loss

    return theta, num_iteration


def closed_form_optimization(X, y, reg_param=0):
    """
    Given (nxd) array X and (nx1) array y, finds the coefficients of a (d-1)^th degree polynomial
    that fits the data using the closed form solution discussed in class.
    Returns a (dx1) array of the coefficients
    Note: `reg_param` is an optional regularization parameter
    """
    # TODO: Implement this function

    theta = np.dot(np.dot(np.linalg.pinv(reg_param * np.eye(X.shape[1]) + np.dot(np.transpose(X),X)),np.transpose(X)),y)

    return theta


def part_a(fname_train):
    # TODO: This function should contain all the code you implement to complete (a)
    print("========== Part A ==========")

    X_raw,y = load_data(fname_train)
    theta_list = []
    eta_list = [1E-4, 1E-3, 1E-2, 1E-1]
    X = generate_polynomial_features(X_raw, 1)
    print("==============i=============")
    for eta in eta_list:
        tic = time.time_ns()
        theta, k = ls_stochastic_gradient_descent(X,y,eta)
        toc = time.time_ns()
        theta_list.append(theta)
        print("eta =",eta,"; theta =",theta,"; k =",k, "; time used in ns =", toc-tic)
    print("=============ii=============")
    tic = time.time_ns()
    theta = closed_form_optimization(X,y)
    toc = time.time_ns()
    print("Closed-form optimization result:",theta,"; time used in ns =", toc-tic)
    error = np.array([np.sum((np.dot(X, theta_estimate) - y) ** 2) - np.sum((np.dot(X, theta) - y) ** 2) for theta_estimate in theta_list])
    index_min = np.argmin(error)
    print("eta =",eta_list[index_min],"gives the closest result")
    print("============iii=============")
    print("Proposing eta = (1-(1-1E-3)*k*1E-4)/1E1")
    tic = time.time_ns()
    theta_estimate, k = ls_stochastic_gradient_descent(X, y, learning_scheme=True)
    toc = time.time_ns()
    print("theta =", theta_estimate, "; k =", k, "; time used in ns =", toc - tic)
    print("deviation from closed-form result =", np.sum((np.dot(X, theta_estimate) - y) ** 2) - np.sum((np.dot(X, theta) - y) ** 2), "; the previous min difference =", error[index_min])

    print("Done!")

def part_b(fname_train, fname_test):
    # TODO: This function should contain all the code you implement to complete (b)
    print("=========== Part B ==========")
    X,y = load_data(fname_train)
    trial_num = 10
    indicator_list = [i + 1 for i in range(trial_num)]
    tick_label = [str(i) for i in indicator_list]
    feather_list = [generate_polynomial_features(X,i) for i in indicator_list]
    theta_list = [closed_form_optimization(feather_list[i], y) for i in range(trial_num)]
    error_list = [calculate_RMS_Error(feather_list[i],y,theta_list[i]) for i in range(trial_num)]
    plt.plot(tick_label, error_list,'r',label = 'Training error')
    X,y = load_data(fname_test)
    feather_list = [generate_polynomial_features(X,i) for i in indicator_list]
    error_list = [calculate_RMS_Error(feather_list[i], y, theta_list[i]) for i in range(trial_num)]
    plt.plot(tick_label, error_list,'b', label = 'Test error')
    plt.legend()
    plt.show()
    print("Done!")


def part_c(fname_train, fname_test):
    # TODO: This function should contain all the code you implement to complete (c)
    print("=========== Part C ==========")

    X, y = load_data(fname_train)
    X = generate_polynomial_features(X,10)
    lambda_list = [10**(-9+i) for i in range(10)]
    lambda_list[0] = 0
    indicator_list = [str(l) for l in lambda_list]
    theta_list = [closed_form_optimization(X,y,l) for l in lambda_list]
    error_list_train = [calculate_RMS_Error(X,y,theta) for theta in theta_list]
    plt.plot(indicator_list, error_list_train, 'r', label = "Training error")
    X, y = load_data(fname_test)
    X = generate_polynomial_features(X, 10)
    error_list_test = [calculate_RMS_Error(X,y,theta) for theta in theta_list]
    plt.plot(indicator_list, error_list_test, 'b', label = "Test error")
    plt.legend()
    plt.show()
    for i in range(10):
        print("lambda =",lambda_list[i],":test RMS error =",error_list_test[i],";train RMS error =",error_list_train[i])
    print("Done!")


def main(fname_train, fname_test):
    # part_a(fname_train)
    # part_b(fname_train, fname_test)
    part_c(fname_train, fname_test)


if __name__ == '__main__':
    main("q5_train.csv", "q5_test.csv")
    # main("dataset/q5_train.csv", "dataset/q5_test.csv")
